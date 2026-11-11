import { NodeServices } from "@effect/platform-node";
import { assert, describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem, Layer, Path } from "effect";
import EmailStore from "../../../src/gmail/email-store.js";
import EmailStoreError from "../../../src/gmail/email-store-error.js";
import type Email from "../../../src/helpers/email.js";
import FilePath from "../../../src/helpers/file-path.js";

const makeEmail = (id: string): typeof Email.Type => ({
  id,
  from: { name: "Ann", email: "ann@example.com" },
  to: { name: "Bob", email: "bob@example.com" },
  subject: `Subject ${id}`,
  textBody: "Body",
  htmlBody: "<p>Body</p>",
  receivedAt: "2026-01-02T03:04:05.000Z",
});

const TestLayer = EmailStore.layer.pipe(Layer.provideMerge(NodeServices.layer));

/** Runs `use` with the path of a database in a fresh temporary directory */
const withDbPath = <A, E, R>(
  use: (dbPath: typeof FilePath.Type) => Effect.Effect<A, E, R>,
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = yield* fs.makeTempDirectoryScoped();
    return yield* use(
      FilePath.make(path.join(directory, "nested", "e.sqlite")),
    );
  }).pipe(Effect.scoped);

describe("EmailStore", () => {
  it.effect("should have no saved IDs in a new database", () =>
    withDbPath((dbPath) =>
      Effect.gen(function* () {
        const store = yield* EmailStore;

        assert.deepStrictEqual([...(yield* store.getSavedIds(dbPath))], []);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("should report the IDs of the emails it has saved", () =>
    withDbPath((dbPath) =>
      Effect.gen(function* () {
        const store = yield* EmailStore;

        yield* store.saveEmails(dbPath, [makeEmail("a"), makeEmail("b")]);

        assert.deepStrictEqual([...(yield* store.getSavedIds(dbPath))].sort(), [
          "a",
          "b",
        ]);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("should return the saved emails with the given IDs", () =>
    withDbPath((dbPath) =>
      Effect.gen(function* () {
        const store = yield* EmailStore;
        yield* store.saveEmails(dbPath, [makeEmail("a"), makeEmail("b")]);

        const emails = yield* store.getEmailsByIds(dbPath, new Set(["b", "z"]));

        assert.deepStrictEqual(emails, [makeEmail("b")]);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("should replace a saved email that is saved again", () =>
    withDbPath((dbPath) =>
      Effect.gen(function* () {
        const store = yield* EmailStore;
        yield* store.saveEmails(dbPath, [makeEmail("a")]);

        yield* store.saveEmails(dbPath, [
          { ...makeEmail("a"), subject: "Changed" },
        ]);

        const [email] = yield* store.getEmailsByIds(dbPath, new Set(["a"]));
        expect(email?.subject).toBe("Changed");
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("should save no emails when given none", () =>
    withDbPath((dbPath) =>
      Effect.gen(function* () {
        const store = yield* EmailStore;

        yield* store.saveEmails(dbPath, []);

        expect((yield* store.getSavedIds(dbPath)).size).toBe(0);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect("should roll back a save that fails part way", () =>
    withDbPath((dbPath) =>
      Effect.gen(function* () {
        const store = yield* EmailStore;
        const unbindable = {
          ...makeEmail("bad"),
          subject: Symbol("x") as unknown as string,
        };

        const failure = yield* store
          .saveEmails(dbPath, [makeEmail("a"), unbindable])
          .pipe(Effect.flip);

        expect(failure).toBeInstanceOf(EmailStoreError);
        expect((yield* store.getSavedIds(dbPath)).size).toBe(0);
      }),
    ).pipe(Effect.provide(TestLayer)),
  );

  it.effect(
    "should fail with an EmailStoreError when the database can't be opened",
    () =>
      Effect.gen(function* () {
        const store = yield* EmailStore;
        const fs = yield* FileSystem.FileSystem;
        const directory = yield* fs.makeTempDirectoryScoped();

        const failure = yield* store
          .getSavedIds(FilePath.make(directory))
          .pipe(Effect.flip);

        expect(failure).toBeInstanceOf(EmailStoreError);
        expect(failure.path).toBe(directory);
      }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );
});
