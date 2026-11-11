import { Console, Effect, FileSystem, Option, type Path } from "effect";
import CredentialsNotFoundError from "../../gmail/credentials-not-found-error.js";
import CredentialsReadError from "../../gmail/credentials-read-error.js";
import EmailFilesWriteError from "../../gmail/email-files-write-error.js";
import EmailStore from "../../gmail/email-store.js";
import EmailStoreError from "../../gmail/email-store-error.js";
import GmailAuthError from "../../gmail/gmail-auth-error.js";
import GmailFetchError from "../../gmail/gmail-fetch-error.js";
import GmailListError from "../../gmail/gmail-list-error.js";
import GmailTools from "../../gmail/gmail-tools.js";
import saveEmailFiles from "../../gmail/save-email-files.js";
import buildGmailQuery from "../../helpers/build-gmail-query.js";
import createEmailTableRows from "../../helpers/create-email-table-rows.js";
import defaultGmailPaths from "../../helpers/default-gmail-paths.js";
import describeCause from "../../helpers/describe-cause.js";
import FilePath from "../../helpers/file-path.js";
import Sender from "../../helpers/sender.js";

/**
 * The domain errors that can end a {@link handleGmailCommand} run. Each
 * carries a distinct `Runtime.errorExitCode` so the process exits with a
 * code specific to the failure that occurred.
 */
type GmailError =
  | CredentialsNotFoundError
  | CredentialsReadError
  | EmailFilesWriteError
  | EmailStoreError
  | GmailAuthError
  | GmailFetchError
  | GmailListError;

/**
 * Downloads the inbox emails from the given senders (or every inbox email if
 * there are none) that aren't saved yet into a SQLite database, optionally
 * saves every matching email as a file, and prints them to standard out as a
 * table, oldest first, logging progress to standard error along the way
 * and, for a domain error, a human-readable message before failing with it
 *
 * @param senders - Email addresses or domains to search for; empty to match
 * every inbox email
 * @param credentials - Path to the Google OAuth client JSON file, or none to
 * use the default location
 * @param db - Path of the SQLite database of downloaded emails
 * @param token - Path of the cached OAuth token
 * @param saveFiles - Directory to also save each email to as a file, or none
 * to skip saving files
 * @returns An effect that resolves once the command has finished, or fails
 * with the {@link GmailError} that stopped it, after logging why
 */
const handleGmailCommand: (
  senders: readonly (typeof Sender.Type)[],
  credentials: Option.Option<typeof FilePath.Type>,
  db: typeof FilePath.Type,
  token: typeof FilePath.Type,
  saveFiles: Option.Option<typeof FilePath.Type>,
) => Effect.Effect<
  void,
  GmailError,
  GmailTools | EmailStore | FileSystem.FileSystem | Path.Path
> = (senders, credentials, db, token, saveFiles) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const gmailTools = yield* GmailTools;
    const emailStore = yield* EmailStore;

    const credentialsPath = Option.getOrElse(credentials, () =>
      FilePath.make(defaultGmailPaths.credentials),
    );
    if (
      !(yield* fs
        .exists(credentialsPath)
        .pipe(Effect.orElseSucceed(() => false)))
    ) {
      return yield* new CredentialsNotFoundError({
        path: credentialsPath,
        isDefault: Option.isNone(credentials),
      });
    }

    const query = buildGmailQuery(senders);
    const savedIds = yield* emailStore.getSavedIds(db);

    yield* Console.error(
      `Authorizing with credentials file [${credentialsPath}].`,
    );
    const auth = yield* gmailTools.authorize(credentialsPath, token);

    yield* Console.error(`Searching Gmail for [${query}].`);
    const ids = yield* gmailTools.listMessageIds(auth, query);
    const skippedIds = ids.intersection(savedIds);
    const newIds = [...ids.difference(savedIds)];
    yield* Console.error(
      `Found ${ids.size.toString()} message(s), ${skippedIds.size.toString()} already saved.`,
    );

    const fetched = yield* gmailTools.fetchEmails(auth, newIds);
    yield* emailStore.saveEmails(db, fetched);
    const all = [
      ...fetched,
      ...(yield* emailStore.getEmailsByIds(db, skippedIds)),
    ];

    if (Option.isSome(saveFiles)) {
      yield* saveEmailFiles(saveFiles.value, all);
      yield* Console.error(
        `Saved ${all.length.toString()} file(s) to ${saveFiles.value}/.`,
      );
    }

    if (all.length > 0) {
      yield* Console.table(createEmailTableRows(all));
    }
  }).pipe(
    Effect.withSpan("gmail-command"),
    Effect.catchTags({
      CredentialsNotFoundError: (e) =>
        Console.error(
          e.isDefault
            ? `❌ No credentials file. Pass --credentials <path> or place the Google OAuth client JSON at [${e.path}].`
            : `❌ Credentials file [${e.path}] not found.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      CredentialsReadError: (e) =>
        Console.error(
          `❌ Could not read credentials file [${e.path}] (${describeCause(e.cause)}). Make sure it is a Google OAuth client JSON file.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      EmailFilesWriteError: (e) =>
        Console.error(
          `❌ Error while saving emails to [${e.directory}] (${describeCause(e.cause)}). Please check the directory and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      EmailStoreError: (e) =>
        Console.error(
          `❌ Error while accessing the email database [${e.path}] (${describeCause(e.cause)}). Please check the file and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      GmailAuthError: (e) =>
        Console.error(
          `❌ Error while authorizing with Gmail (${describeCause(e.cause)}). If your authorization has expired, delete the token file [${token}] and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      GmailFetchError: (e) =>
        Console.error(
          `❌ Error while fetching message [${e.messageId}] (${describeCause(e.cause)}). Please check your setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      GmailListError: (e) =>
        Console.error(
          `❌ Error while searching Gmail (${describeCause(e.cause)}). Please check your setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
    }),
  );

export default handleGmailCommand;
