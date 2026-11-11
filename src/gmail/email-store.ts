import { Context, Effect, FileSystem, Layer, Path } from "effect";
import { DatabaseSync } from "node:sqlite";
import EmailStoreError from "./email-store-error.js";
import type Email from "../helpers/email.js";
import type FilePath from "../helpers/file-path.js";

/**
 * The SQLite database of downloaded emails, so later runs only fetch new
 * messages
 */
class EmailStore extends Context.Service<
  EmailStore,
  {
    /**
     * Reads the Gmail message IDs of every email in the database
     *
     * @param dbPath - Path of the SQLite database, created if missing
     * @returns An Effect that resolves to the saved message IDs
     */
    readonly getSavedIds: (
      dbPath: typeof FilePath.Type,
    ) => Effect.Effect<Set<string>, EmailStoreError>;

    /**
     * Saves emails to the database in a single transaction, replacing any
     * that are already saved
     *
     * @param dbPath - Path of the SQLite database, created if missing
     * @param emails - The emails to save
     * @returns An Effect that resolves once the emails are saved
     */
    readonly saveEmails: (
      dbPath: typeof FilePath.Type,
      emails: readonly (typeof Email.Type)[],
    ) => Effect.Effect<void, EmailStoreError>;

    /**
     * Reads the emails with the given Gmail message IDs from the database
     *
     * @param dbPath - Path of the SQLite database, created if missing
     * @param ids - The Gmail message IDs to read
     * @returns An Effect that resolves to the emails found
     */
    readonly getEmailsByIds: (
      dbPath: typeof FilePath.Type,
      ids: ReadonlySet<string>,
    ) => Effect.Effect<(typeof Email.Type)[], EmailStoreError>;
  }
>()("@app/EmailStore") {
  static readonly layer = Layer.effect(
    EmailStore,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      /**
       * Opens the database for the duration of `use`, creating its directory
       * and table if needed, and closes it afterwards
       */
      const withDatabase = <A>(
        dbPath: typeof FilePath.Type,
        use: (db: DatabaseSync) => A,
      ) =>
        Effect.gen(function* () {
          yield* fs.makeDirectory(path.dirname(dbPath), { recursive: true });
          const db = yield* Effect.acquireRelease(
            Effect.try(() => new DatabaseSync(dbPath)),
            (db) =>
              Effect.sync(() => {
                db.close();
              }),
          );
          return yield* Effect.try(() => {
            db.exec(`
              CREATE TABLE IF NOT EXISTS emails (
                gmail_id    TEXT PRIMARY KEY,
                from_name   TEXT NOT NULL,
                from_email  TEXT NOT NULL,
                to_name     TEXT NOT NULL,
                to_email    TEXT NOT NULL,
                subject     TEXT NOT NULL,
                text_body   TEXT NOT NULL,
                html_body   TEXT NOT NULL DEFAULT '',
                received_at TEXT NOT NULL
              )
            `);
            return use(db);
          });
        }).pipe(
          Effect.scoped,
          Effect.mapError(
            (cause) => new EmailStoreError({ path: dbPath, cause }),
          ),
        );

      const getSavedIds = Effect.fn("email-store.get-saved-ids")(function* (
        dbPath: typeof FilePath.Type,
      ) {
        return yield* withDatabase(
          dbPath,
          (db) =>
            new Set(
              db
                .prepare("SELECT gmail_id FROM emails")
                .all()
                .map((row) => String(row["gmail_id"])),
            ),
        );
      });

      const saveEmails = Effect.fn("email-store.save-emails")(function* (
        dbPath: typeof FilePath.Type,
        emails: readonly (typeof Email.Type)[],
      ) {
        yield* withDatabase(dbPath, (db) => {
          const insert = db.prepare(
            `INSERT OR REPLACE INTO emails
               (gmail_id, from_name, from_email, to_name, to_email, subject, text_body, html_body, received_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          );
          db.exec("BEGIN");
          try {
            for (const e of emails) {
              insert.run(
                e.id,
                e.from.name,
                e.from.email,
                e.to.name,
                e.to.email,
                e.subject,
                e.textBody,
                e.htmlBody,
                e.receivedAt,
              );
            }
            db.exec("COMMIT");
          } catch (error) {
            db.exec("ROLLBACK");
            throw error;
          }
        });
      });

      const getEmailsByIds = Effect.fn("email-store.get-emails-by-ids")(
        function* (dbPath: typeof FilePath.Type, ids: ReadonlySet<string>) {
          return yield* withDatabase(dbPath, (db) =>
            db
              .prepare("SELECT * FROM emails")
              .all()
              .filter((row) => ids.has(String(row["gmail_id"])))
              .map((row) => ({
                id: String(row["gmail_id"]),
                from: {
                  name: String(row["from_name"]),
                  email: String(row["from_email"]),
                },
                to: {
                  name: String(row["to_name"]),
                  email: String(row["to_email"]),
                },
                subject: String(row["subject"]),
                textBody: String(row["text_body"]),
                htmlBody: String(row["html_body"]),
                receivedAt: String(row["received_at"]),
              })),
          );
        },
      );

      return EmailStore.of({ getSavedIds, saveEmails, getEmailsByIds });
    }),
  );
}

export default EmailStore;
