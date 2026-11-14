import { Console, Effect, type FileSystem, Option, type Path } from "effect";
import printBanner from "../print-banner.js";
import ConfigFileLocator from "../../config/config-file-locator.js";
import CredentialsFileNotFoundError from "../../config/credentials-file-not-found-error.js";
import CredentialsFileResolver from "../../config/credentials-file-resolver.js";
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
import describeCause from "../../helpers/describe-cause.js";
import FilePath from "../../helpers/file-path.js";
import Sender from "../../helpers/sender.js";

/**
 * The domain errors that can end a {@link handleGmailCommand} run. Each
 * carries a distinct `Runtime.errorExitCode` so the process exits with a
 * code specific to the failure that occurred.
 */
type GmailError =
  | CredentialsFileNotFoundError
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
 * @param credentials - Path to the OAuth2 credentials JSON file, if given;
 * otherwise the well-known location is used
 * @param database - Path of the SQLite database of downloaded emails, if given;
 * otherwise `gmail.sqlite` in the Config directory is used
 * @param token - Path of the cached OAuth token, if given; otherwise
 * `gmail-token.json` in the Config directory is used
 * @param output - Directory to also save each email to as a file, or none
 * to skip saving files
 * @param quiet - When true, suppresses the banner and status messages;
 * runtime errors are still printed
 * @returns An effect that resolves once the command has finished, or fails
 * with the {@link GmailError} that stopped it, after logging why
 */
const handleGmailCommand: (
  senders: readonly (typeof Sender.Type)[],
  credentials: Option.Option<typeof FilePath.Type>,
  database: Option.Option<typeof FilePath.Type>,
  token: Option.Option<typeof FilePath.Type>,
  output: Option.Option<typeof FilePath.Type>,
  quiet: boolean,
) => Effect.Effect<
  void,
  GmailError,
  | ConfigFileLocator
  | CredentialsFileResolver
  | EmailStore
  | FileSystem.FileSystem
  | GmailTools
  | Path.Path
> = Effect.fn("gmail-command")(
  function* (senders, credentials, database, token, output, quiet) {
    const configFileLocator = yield* ConfigFileLocator;
    const credentialsFileResolver = yield* CredentialsFileResolver;
    const gmailTools = yield* GmailTools;
    const emailStore = yield* EmailStore;

    const logStatus = (message: string) =>
      quiet ? Effect.void : Console.error(message);

    yield* printBanner(quiet);

    const credentialsFile = yield* credentialsFileResolver.resolve(credentials);
    const databaseFile = yield* configFileLocator.locate(
      database,
      "gmail.sqlite",
    );
    const tokenFile = yield* configFileLocator.locate(
      token,
      "gmail-token.json",
    );

    const query = buildGmailQuery(senders);

    yield* logStatus(
      `Authorizing with OAuth2 credentials file [${credentialsFile.path}] (${credentialsFile.source}).`,
    );
    const auth = yield* gmailTools.authorize(
      credentialsFile.path,
      tokenFile.path,
    );
    const savedIds = yield* emailStore.getSavedIds(databaseFile.path);

    yield* logStatus(`Searching Gmail for [${query}].`);
    const ids = yield* gmailTools.listMessageIds(auth, query);
    const skippedIds = ids.intersection(savedIds);
    const newIds = [...ids.difference(savedIds)];
    yield* logStatus(
      `Found ${ids.size.toString()} message(s), ${skippedIds.size.toString()} already saved.`,
    );

    const fetched = yield* gmailTools.fetchEmails(auth, newIds);
    yield* emailStore.saveEmails(databaseFile.path, fetched);
    const all = [
      ...fetched,
      ...(yield* emailStore.getEmailsByIds(databaseFile.path, skippedIds)),
    ];

    if (Option.isSome(output)) {
      if (all.length === 0) {
        yield* logStatus(`No emails to save to ${output.value}/.`);
      } else {
        yield* saveEmailFiles(output.value, all);
        yield* logStatus(
          `Saved ${all.length.toString()} file(s) to ${output.value}/.`,
        );
      }
    }

    if (all.length > 0) {
      yield* Console.table(createEmailTableRows(all));
    }
  },
  Effect.catchTags({
    CredentialsFileNotFoundError: (e) =>
      Console.error(
        `❌ Could not find OAuth2 credentials file [${e.path}] (${e.source}). Make sure the file exists.`,
      ).pipe(Effect.andThen(() => Effect.fail(e))),
    CredentialsReadError: (e) =>
      Console.error(
        `❌ Could not read OAuth2 credentials file [${e.path}] (${describeCause(e.cause)}). Make sure it is a Google OAuth client JSON file.`,
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
        `❌ Error while authorizing with Gmail (${describeCause(e.cause)}). If your authorization has expired, delete the token file [${e.tokenPath}] and try again.`,
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
