import { assert, describe, expect, it, vi } from "@effect/vitest";
import {
  Console,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Runtime,
} from "effect";
import { TestConsole } from "effect/testing";
import type { Auth } from "googleapis";
import handleGmailCommand from "../../../../src/cli/command-handlers/handle-gmail-command.js";
import CredentialsNotFoundError from "../../../../src/gmail/credentials-not-found-error.js";
import CredentialsReadError from "../../../../src/gmail/credentials-read-error.js";
import EmailFilesWriteError from "../../../../src/gmail/email-files-write-error.js";
import EmailStore from "../../../../src/gmail/email-store.js";
import EmailStoreError from "../../../../src/gmail/email-store-error.js";
import GmailAuthError from "../../../../src/gmail/gmail-auth-error.js";
import GmailFetchError from "../../../../src/gmail/gmail-fetch-error.js";
import GmailListError from "../../../../src/gmail/gmail-list-error.js";
import GmailTools from "../../../../src/gmail/gmail-tools.js";
import defaultGmailPaths from "../../../../src/helpers/default-gmail-paths.js";
import type Email from "../../../../src/helpers/email.js";
import FilePath from "../../../../src/helpers/file-path.js";
import Sender from "../../../../src/helpers/sender.js";

const fakeAuth = {} as unknown as Auth.OAuth2Client;
const credentials = FilePath.make("/secrets/client.json");
const db = FilePath.make("/data/emails.sqlite");
const token = FilePath.make("/data/token.json");
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
    exists?: boolean;
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
  exists: vi.fn(() => Effect.succeed(overrides.exists ?? true)),
  makeDirectory: vi.fn(() => Effect.void),
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
              exists: doubles.exists,
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
          db,
          token,
          Option.none(),
        ).pipe(provideDoubles(doubles, tables));

        expect(doubles.exists).toHaveBeenCalledExactlyOnceWith(credentials);
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
          `Authorizing with credentials file [${credentials}].`,
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
        db,
        token,
        Option.none(),
      ).pipe(provideDoubles(doubles, tables));

      assert.deepStrictEqual(tables, []);
      expect(doubles.listMessageIds).toHaveBeenCalledExactlyOnceWith(
        fakeAuth,
        "in:inbox",
      );
    }),
  );

  it.effect("should use the default credentials file when none is given", () =>
    Effect.gen(function* () {
      const doubles = makeDoubles();

      yield* handleGmailCommand(
        senders,
        Option.none(),
        db,
        token,
        Option.none(),
      ).pipe(provideDoubles(doubles, []));

      expect(doubles.exists).toHaveBeenCalledExactlyOnceWith(
        defaultGmailPaths.credentials,
      );
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
          db,
          token,
          Option.some(FilePath.make("output")),
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
    "should fail with a distinct exit code on a missing default credentials file after logging how to provide one",
    () =>
      Effect.gen(function* () {
        const doubles = makeDoubles({ exists: false });

        const failure = yield* handleGmailCommand(
          senders,
          Option.none(),
          db,
          token,
          Option.none(),
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(doubles.authorize).not.toHaveBeenCalled();
        expect(failure).toStrictEqual(
          new CredentialsNotFoundError({
            path: defaultGmailPaths.credentials,
            isDefault: true,
          }),
        );
        expect(Runtime.getErrorExitCode(failure)).toBe(40);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          `❌ No credentials file. Pass --credentials <path> or place the Google OAuth client JSON at [${defaultGmailPaths.credentials}].`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a missing explicit credentials file after logging it",
    () =>
      Effect.gen(function* () {
        const doubles = makeDoubles({ exists: false });

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          db,
          token,
          Option.none(),
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(failure).toStrictEqual(
          new CredentialsNotFoundError({ path: credentials, isDefault: false }),
        );
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          `❌ Credentials file [${credentials}] not found.`,
        ]);
      }),
  );

  it.effect(
    "should treat a credentials file that can't be checked as missing",
    () =>
      Effect.gen(function* () {
        const doubles = makeDoubles();
        doubles.exists.mockReturnValue(Effect.fail("denied") as never);

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          db,
          token,
          Option.none(),
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(failure._tag).toBe("CredentialsNotFoundError");
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
          db,
          token,
          Option.none(),
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(41);
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          `❌ Could not read credentials file [${credentials}] (bad json). Make sure it is a Google OAuth client JSON file.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on an authorization failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new GmailAuthError({ cause: new Error("invalid_grant") });
        const doubles = makeDoubles({ authorize: () => Effect.fail(error) });

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          db,
          token,
          Option.none(),
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(42);
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
          db,
          token,
          Option.none(),
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(43);
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
          db,
          token,
          Option.none(),
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(doubles.saveEmails).not.toHaveBeenCalled();
        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(44);
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          "❌ Error while fetching message [new] (gone). Please check your setup and try again.",
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a database failure after logging it",
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
          db,
          token,
          Option.none(),
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(doubles.authorize).not.toHaveBeenCalled();
        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(45);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          `❌ Error while accessing the email database [${db}] (locked). Please check the file and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a file write failure after logging it",
    () =>
      Effect.gen(function* () {
        const doubles = makeDoubles({
          writeFileString: () => Effect.die("unused"),
        });
        doubles.makeDirectory.mockReturnValue(
          Effect.fail("read-only") as never,
        );

        const failure = yield* handleGmailCommand(
          senders,
          Option.some(credentials),
          db,
          token,
          Option.some(FilePath.make("output")),
        ).pipe(provideDoubles(doubles, []), Effect.flip);

        expect(failure).toStrictEqual(
          new EmailFilesWriteError({ directory: "output", cause: "read-only" }),
        );
        expect(Runtime.getErrorExitCode(failure)).toBe(46);
        assert.deepStrictEqual((yield* TestConsole.errorLines).slice(-1), [
          "❌ Error while saving emails to [output] (read-only). Please check the directory and try again.",
        ]);
      }),
  );
});
