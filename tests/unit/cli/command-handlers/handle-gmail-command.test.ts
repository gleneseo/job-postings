import { assert, describe, expect, it, vi } from "@effect/vitest";
import {
  Console,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  PlatformError,
  Runtime,
} from "effect";
import { TestConsole } from "effect/testing";
import type { Auth } from "googleapis";
import banner from "../../../../src/cli/banner.js";
import handleGmailCommand from "../../../../src/cli/command-handlers/handle-gmail-command.js";
import ConfigFileLocator from "../../../../src/config/config-file-locator.js";
import CredentialsFileNotFoundError from "../../../../src/config/credentials-file-not-found-error.js";
import CredentialsFileResolver from "../../../../src/config/credentials-file-resolver.js";
import CredentialsReadError from "../../../../src/gmail/credentials-read-error.js";
import EmailFilesWriteError from "../../../../src/gmail/email-files-write-error.js";
import EmailStore from "../../../../src/gmail/email-store.js";
import EmailStoreError from "../../../../src/gmail/email-store-error.js";
import GmailAuthError from "../../../../src/gmail/gmail-auth-error.js";
import GmailFetchError from "../../../../src/gmail/gmail-fetch-error.js";
import GmailListError from "../../../../src/gmail/gmail-list-error.js";
import GmailTools from "../../../../src/gmail/gmail-tools.js";
import type Email from "../../../../src/helpers/email.js";
import FilePath from "../../../../src/helpers/file-path.js";
import Sender from "../../../../src/helpers/sender.js";

const fakeAuth = {} as unknown as Auth.OAuth2Client;
const credentials = FilePath.make("/secrets/client.json");
const db = FilePath.make("/data/emails.sqlite");
const token = FilePath.make("/data/token.json");
const wellKnown = (fileName: string) =>
  FilePath.make(`/config/gleneseo-helpers/${fileName}`);
const senders = [Sender.make("example.com")];

const makeEmail = (id: string, receivedAt: string): typeof Email.Type => ({
  id,
  from: { name: "Ann", email: "ann@example.com" },
  to: { name: "Bob", email: "bob@example.com" },
  subject: `Subject ${id}`,
  textBody: "Body",
  htmlBody: "",
  receivedAt,
});
const newEmail = makeEmail("new", "2026-02-01T00:00:00.000Z");
const savedEmail = makeEmail("saved", "2026-01-01T00:00:00.000Z");

const makeDoubles = (
  overrides: {
    resolve?: (
      explicitPath: Option.Option<typeof FilePath.Type>,
    ) => Effect.Effect<
      {
        path: typeof FilePath.Type;
        source: "flag" | "well-known location";
      },
      CredentialsFileNotFoundError
    >;
    authorize?: () => Effect.Effect<
      Auth.OAuth2Client,
      CredentialsReadError | GmailAuthError
    >;
    listMessageIds?: () => Effect.Effect<Set<string>, GmailListError>;
    fetchEmails?: () => Effect.Effect<(typeof Email.Type)[], GmailFetchError>;
    getSavedIds?: () => Effect.Effect<Set<string>, EmailStoreError>;
    saveEmails?: () => Effect.Effect<void, EmailStoreError>;
    getEmailsByIds?: () => Effect.Effect<
      (typeof Email.Type)[],
      EmailStoreError
    >;
    writeFileString?: () => Effect.Effect<void>;
  } = {},
) => ({
  resolve: vi.fn(
    overrides.resolve ??
      ((explicitPath: Option.Option<typeof FilePath.Type>) =>
        Effect.succeed({
          path: Option.getOrElse(explicitPath, () => wellKnown("gmail.json")),
          source: Option.isSome(explicitPath)
            ? ("flag" as const)
            : ("well-known location" as const),
        })),
  ),
  locate: vi.fn(
    (explicitPath: Option.Option<typeof FilePath.Type>, fileName: string) =>
      Effect.succeed({
        path: Option.getOrElse(explicitPath, () => wellKnown(fileName)),
        source: Option.isSome(explicitPath)
          ? ("flag" as const)
          : ("well-known location" as const),
        exists: true,
      }),
  ),
  makeDirectory: vi.fn<FileSystem.FileSystem["makeDirectory"]>(
    () => Effect.void,
  ),
  writeFileString: vi.fn(overrides.writeFileString ?? (() => Effect.void)),
  authorize: vi.fn(overrides.authorize ?? (() => Effect.succeed(fakeAuth))),
  listMessageIds: vi.fn(
    overrides.listMessageIds ??
      (() => Effect.succeed(new Set(["new", "saved"]))),
  ),
  fetchEmails: vi.fn(
    overrides.fetchEmails ?? (() => Effect.succeed([newEmail])),
  ),
  getSavedIds: vi.fn(
    overrides.getSavedIds ?? (() => Effect.succeed(new Set(["saved"]))),
  ),
  saveEmails: vi.fn(overrides.saveEmails ?? (() => Effect.void)),
  getEmailsByIds: vi.fn(
    overrides.getEmailsByIds ?? (() => Effect.succeed([savedEmail])),
  ),
});

const withTTY = <A, E, R>(isTTY: boolean, effect: Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      const original = process.stdout.isTTY;
      process.stdout.isTTY = isTTY;
      return original;
    }),
    () => effect,
    (original) =>
      Effect.sync(() => {
        process.stdout.isTTY = original;
      }),
  );

/**
 * Provides the doubles, along with the test's console extended to also record
 * the tables it is asked to print, which `TestConsole` doesn't expose
 */
const provideDoubles =
  (doubles: ReturnType<typeof makeDoubles>, tables: unknown[]) =>
  <A, E, R>(self: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const testConsole = yield* Console.Console;
      return yield* self.pipe(
        Effect.provideService(
          Console.Console,
          Object.assign({}, testConsole, {
            table: (data: unknown) => {
              tables.push(data);
            },
          }),
        ),
        Effect.provide(
          Layer.mergeAll(
            Layer.succeed(CredentialsFileResolver, {
              resolve: doubles.resolve,
            }),
            Layer.succeed(ConfigFileLocator, { locate: doubles.locate }),
            Layer.succeed(GmailTools, {
              authorize: doubles.authorize,
              listMessageIds: doubles.listMessageIds,
              fetchEmails: doubles.fetchEmails,
            }),
            Layer.succeed(EmailStore, {
              getSavedIds: doubles.getSavedIds,
              saveEmails: doubles.saveEmails,
              getEmailsByIds: doubles.getEmailsByIds,
            }),
            FileSystem.layerNoop({
              makeDirectory: doubles.makeDirectory,
              writeFileString: doubles.writeFileString,
            }),
            Path.layer,
          ),
        ),
      );
    });

describe("handleGmailCommand", () => {
  it.effect(
    "should download the new emails, save them, and print every matching email as a table, oldest first",
    () =>
      Effect.gen(function* () {
        const doubles = makeDoubles();
        const tables: unknown[] = [];

        yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          Option.some(db),
          Option.some(token),
          Option.none(),
          false,
        ).pipe(provideDoubles(doubles, tables));

        expect(doubles.resolve).toHaveBeenCalledExactlyOnceWith(
          Option.some(credentials),
        );
        expect(doubles.getSavedIds).toHaveBeenCalledExactlyOnceWith(db);
        expect(doubles.authorize).toHaveBeenCalledExactlyOnceWith(
          credentials,
          token,
        );
        expect(doubles.listMessageIds).toHaveBeenCalledExactlyOnceWith(
          fakeAuth,
          "in:inbox from:example.com",
        );
        expect(doubles.fetchEmails).toHaveBeenCalledExactlyOnceWith(fakeAuth, [
          "new",
        ]);
        expect(doubles.saveEmails).toHaveBeenCalledExactlyOnceWith(db, [
          newEmail,
        ]);
        expect(doubles.getEmailsByIds).toHaveBeenCalledExactlyOnceWith(
          db,
          new Set(["saved"]),
        );
        expect(doubles.writeFileString).not.toHaveBeenCalled();
        assert.deepStrictEqual(
          (tables[0] as { Subject: string }[]).map((row) => row.Subject),
          ["Subject saved", "Subject new"],
        );
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          `Authorizing with OAuth2 credentials file [${credentials}] (flag).`,
          "Searching Gmail for [in:inbox from:example.com].",
          "Found 2 message(s), 1 already saved.",
        ]);
      }),
  );

  it.effect("should print no table when nothing matches", () =>
    Effect.gen(function* () {
      const doubles = makeDoubles({
        listMessageIds: () => Effect.succeed(new Set()),
        fetchEmails: () => Effect.succeed([]),
        getEmailsByIds: () => Effect.succeed([]),
      });
      const tables: unknown[] = [];

      yield* handleGmailCommand(
        [],
        Option.some(credentials),
        Option.some(db),
        Option.some(token),
        Option.none(),
        false,
      ).pipe(provideDoubles(doubles, tables));

      assert.deepStrictEqual(tables, []);
      expect(doubles.listMessageIds).toHaveBeenCalledExactlyOnceWith(
        fakeAuth,
        "in:inbox",
      );
    }),
  );

  it.effect(
    "should use the well-known locations in the Config directory when no paths are given",
    () =>
      Effect.gen(function* () {
        const doubles = makeDoubles();

        yield* handleGmailCommand(
          senders,
          Option.none(),
          Option.none(),
          Option.none(),
          Option.none(),
          false,
        ).pipe(provideDoubles(doubles, []));

        expect(doubles.resolve).toHaveBeenCalledExactlyOnceWith(Option.none());
        expect(doubles.locate.mock.calls).toStrictEqual([
          [Option.none(), "gmail.sqlite"],
          [Option.none(), "gmail-token.json"],
        ]);
        expect(doubles.getSavedIds).toHaveBeenCalledExactlyOnceWith(
          wellKnown("gmail.sqlite"),
        );
        expect(doubles.authorize).toHaveBeenCalledExactlyOnceWith(
          wellKnown("gmail.json"),
          wellKnown("gmail-token.json"),
        );
        assert.strictEqual(
          (yield* TestConsole.errorLines)[0],
          `Authorizing with OAuth2 credentials file [${wellKnown("gmail.json")}] (well-known location).`,
        );
      }),
  );

  it.effect(
    "should print the banner on an interactive terminal when not quiet",
    () =>
      Effect.gen(function* () {
        yield* withTTY(
          true,
          handleGmailCommand(
            senders,
            Option.some(credentials),
            Option.some(db),
            Option.some(token),
            Option.none(),
            false,
          ).pipe(provideDoubles(makeDoubles(), [])),
        );

        assert.deepStrictEqual(yield* TestConsole.logLines, [banner]);
      }),
  );

  it.effect(
    "should print neither the banner nor status messages, but still the table, when quiet",
    () =>
      Effect.gen(function* () {
        const tables: unknown[] = [];

        yield* withTTY(
          true,
          handleGmailCommand(
            senders,
            Option.some(credentials),
            Option.some(db),
            Option.some(token),
            Option.some(FilePath.make("output")),
            true,
          ).pipe(provideDoubles(makeDoubles(), tables)),
        );

        assert.deepStrictEqual(yield* TestConsole.logLines, []);
        assert.deepStrictEqual(yield* TestConsole.errorLines, []);
        assert.strictEqual(tables.length, 1);
      }),
  );

  it.effect(
    "should also save every matching email as a file when asked to",
    () =>
      Effect.gen(function* () {
        const doubles = makeDoubles();

        yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          Option.some(db),
          Option.some(token),
          Option.some(FilePath.make("output")),
          false,
        ).pipe(provideDoubles(doubles, []));

        expect(doubles.makeDirectory).toHaveBeenCalledExactlyOnceWith(
          "output",
          {
            recursive: true,
          },
        );
        assert.deepStrictEqual(
          doubles.writeFileString.mock.calls.map(([path]: unknown[]) => path),
          ["output/Subject new.txt", "output/Subject saved.txt"],
        );
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          "Saved 2 file(s) to output/.",
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a missing credentials file after logging it",
    () =>
      Effect.gen(function* () {
        const notFound = new CredentialsFileNotFoundError({
          path: wellKnown("gmail.json"),
          source: "well-known location",
        });
        const doubles = makeDoubles({ resolve: () => Effect.fail(notFound) });

        const failure = yield* handleGmailCommand(
          senders,
          Option.none(),
          Option.some(db),
          Option.some(token),
          Option.none(),
          false,
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(doubles.getSavedIds).not.toHaveBeenCalled();
        expect(doubles.authorize).not.toHaveBeenCalled();
        expect(failure).toStrictEqual(notFound);
        expect(Runtime.getErrorExitCode(failure)).toBe(41);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          `❌ Could not find OAuth2 credentials file [${wellKnown("gmail.json")}] (well-known location). Make sure the file exists.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on an unreadable credentials file after logging it",
    () =>
      Effect.gen(function* () {
        const error = new CredentialsReadError({
          path: credentials,
          cause: new Error("bad json"),
        });
        const doubles = makeDoubles({ authorize: () => Effect.fail(error) });

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          Option.some(db),
          Option.some(token),
          Option.none(),
          false,
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(doubles.getSavedIds).not.toHaveBeenCalled();
        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(42);
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          `❌ Could not read OAuth2 credentials file [${credentials}] (bad json). Make sure it is a Google OAuth client JSON file.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on an authorization failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new GmailAuthError({
          tokenPath: token,
          cause: new Error("invalid_grant"),
        });
        const doubles = makeDoubles({ authorize: () => Effect.fail(error) });

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          Option.some(db),
          Option.some(token),
          Option.none(),
          false,
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(doubles.getSavedIds).not.toHaveBeenCalled();
        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(50);
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          `❌ Error while authorizing with Gmail (invalid_grant). If your authorization has expired, delete the token file [${token}] and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a search failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new GmailListError({ cause: new Error("quota") });
        const doubles = makeDoubles({
          listMessageIds: () => Effect.fail(error),
        });

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          Option.some(db),
          Option.some(token),
          Option.none(),
          false,
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(51);
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          "❌ Error while searching Gmail (quota). Please check your setup and try again.",
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a fetch failure after logging it, without saving anything",
    () =>
      Effect.gen(function* () {
        const error = new GmailFetchError({
          messageId: "new",
          cause: new Error("gone"),
        });
        const doubles = makeDoubles({ fetchEmails: () => Effect.fail(error) });

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          Option.some(db),
          Option.some(token),
          Option.none(),
          false,
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(doubles.saveEmails).not.toHaveBeenCalled();
        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(52);
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          "❌ Error while fetching message [new] (gone). Please check your setup and try again.",
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a database failure after authorizing and logging it",
    () =>
      Effect.gen(function* () {
        const error = new EmailStoreError({
          path: db,
          cause: new Error("locked"),
        });
        const doubles = makeDoubles({ getSavedIds: () => Effect.fail(error) });

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          Option.some(db),
          Option.some(token),
          Option.none(),
          false,
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(doubles.authorize).toHaveBeenCalledOnce();
        expect(doubles.listMessageIds).not.toHaveBeenCalled();
        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(60);
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          `❌ Error while accessing the email database [${db}] (locked). Please check the file and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a file write failure after logging it",
    () =>
      Effect.gen(function* () {
        const cause = PlatformError.systemError({
          _tag: "PermissionDenied",
          module: "FileSystem",
          method: "makeDirectory",
          pathOrDescriptor: "output",
          description: "read-only",
        });
        const doubles = makeDoubles({
          writeFileString: () => Effect.die("unused"),
        });
        doubles.makeDirectory.mockReturnValue(Effect.fail(cause));

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          Option.some(db),
          Option.some(token),
          Option.some(FilePath.make("output")),
          false,
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(failure).toStrictEqual(
          new EmailFilesWriteError({ directory: "output", cause }),
        );
        expect(Runtime.getErrorExitCode(failure)).toBe(61);
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          "❌ Error while saving emails to [output] (PermissionDenied: FileSystem.makeDirectory (output): read-only). Please check the directory and try again.",
        ]);
      }),
  );
});
