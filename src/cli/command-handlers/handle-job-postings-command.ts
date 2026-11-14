import { Console, Duration, Effect, Option } from "effect";
import printBanner from "../print-banner.js";
import KeyFileResolver from "../../config/key-file-resolver.js";
import KeyFileNotFoundError from "../../config/key-file-not-found-error.js";
import GoogleTools from "../../google/google-tools.js";
import MissingFolderIdError from "../../google/missing-folder-id-error.js";
import FilePath from "../../helpers/file-path.js";
import FolderName from "../../helpers/folder-name.js";
import FileName from "../../helpers/file-name.js";
import FolderId from "../../helpers/folder-id.js";
import TabIndex from "../../helpers/tab-index.js";
import TimeoutSeconds from "../../helpers/timeout-seconds.js";
import MissingFileIdError from "../../google/missing-file-id-error.js";
import FileId from "../../helpers/file-id.js";
import sortValues from "../../helpers/sort-values.js";
import createCsv from "../../helpers/create-csv.js";
import DuplicateFilesFoundError from "../../google/duplicate-files-found-error.js";
import DuplicateFoldersFoundError from "../../google/duplicate-folders-found-error.js";
import FileNotFoundError from "../../google/file-not-found-error.js";
import FileSearchError from "../../google/file-search-error.js";
import FolderNotFoundError from "../../google/folder-not-found-error.js";
import FolderSearchError from "../../google/folder-search-error.js";
import InvalidTabIndexError from "../../google/invalid-tab-index-error.js";
import NoTabDataError from "../../google/no-tab-data-error.js";
import TabsFetchError from "../../google/tabs-fetch-error.js";
import TabValuesFetchError from "../../google/tab-values-fetch-error.js";

/**
 * The domain errors that can end a {@link handleJobPostingsCommand} run. Each
 * carries a distinct `Runtime.errorExitCode` so the process exits with a
 * code specific to the failure that occurred.
 */
type JobPostingsError =
  | DuplicateFilesFoundError
  | DuplicateFoldersFoundError
  | FileNotFoundError
  | FileSearchError
  | FolderNotFoundError
  | FolderSearchError
  | InvalidTabIndexError
  | KeyFileNotFoundError
  | MissingFileIdError
  | MissingFolderIdError
  | NoTabDataError
  | TabsFetchError
  | TabValuesFetchError;

/**
 * Resolves the key file, authenticates with Google using it, locates the Job
 * Postings sheet by folder and file name, reads the given tab, sorts its
 * values, and prints them to standard out as CSV, logging progress to
 * standard error along the way and, for a domain error, a human-readable
 * message before failing with it
 *
 * @param key - Path to the Google service account JSON key file, if
 * given; otherwise the well-known location is used
 * @param folderName - Name of the Google Drive folder containing the Job
 * Postings sheet
 * @param fileName - File name of the Job Postings sheet
 * @param tabIndex - Zero-based index of the tab to read
 * @param quiet - When true, suppresses the banner and status messages;
 * runtime errors are still printed
 * @param timeoutSeconds - Network request timeout, in seconds, for each
 * Google API call
 * @returns An effect that resolves once the command has finished, or fails
 * with the {@link JobPostingsError} that stopped it, after logging why
 */
const handleJobPostingsCommand: (
  key: Option.Option<typeof FilePath.Type>,
  folderName: typeof FolderName.Type,
  fileName: typeof FileName.Type,
  tabIndex: typeof TabIndex.Type,
  quiet: boolean,
  timeoutSeconds: typeof TimeoutSeconds.Type,
) => Effect.Effect<void, JobPostingsError, GoogleTools | KeyFileResolver> = (
  key,
  folderName,
  fileName,
  tabIndex,
  quiet,
  timeoutSeconds,
) =>
  Effect.gen(function* () {
    const googleTools = yield* GoogleTools;
    const keyFileResolver = yield* KeyFileResolver;
    const timeout = Duration.seconds(timeoutSeconds);

    const logStatus = (message: string) =>
      quiet ? Effect.void : Console.error(message);

    yield* printBanner(quiet);

    const keyFile = yield* keyFileResolver.resolve(key);

    yield* logStatus(
      `Authenticating with key file [${keyFile.path}] (${keyFile.source}).`,
    );
    const auth = yield* googleTools.getAuth(keyFile.path);

    yield* logStatus(`Searching for folder [${folderName}].`);
    const folder = yield* googleTools.getFolder(auth, folderName, timeout);

    if (!folder.id) {
      return yield* new MissingFolderIdError({ folderName });
    }

    yield* logStatus(
      `Searching for file [${fileName}] in folder [${folderName}].`,
    );
    const file = yield* googleTools.getFile(
      auth,
      fileName,
      FolderId.make(folder.id),
      timeout,
    );

    if (!file.id) {
      return yield* new MissingFileIdError({ fileName });
    }

    yield* logStatus(
      `Fetching values for tab at index [${tabIndex.toString()}] in file [${fileName}].`,
    );
    const values = yield* googleTools.getTabValues(
      auth,
      FileId.make(file.id),
      tabIndex,
      timeout,
    );

    if (!values.length) {
      return yield* new NoTabDataError({ tabIndex });
    }

    yield* Console.error(`Sorting values from [${fileName}].`);
    yield* sortValues(values).pipe(
      Effect.andThen((x) => createCsv(x)),
      Effect.andThen((x) => Console.log(x)),
      Effect.andThen(() => Console.error("Success.")),
    );
  }).pipe(
    Effect.withSpan("job-postings-command"),
    Effect.catchTags({
      DuplicateFilesFoundError: (e) =>
        Console.error(
          `❌ Multiple files found for [${fileName}] in folder [${folderName}]. The file name must be unique.`,
          e.duplicates,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      DuplicateFoldersFoundError: (e) =>
        Console.error(
          `❌ Multiple folders found for [${folderName}]. The folder name must be unique.`,
          e.duplicates,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      FileNotFoundError: (e) =>
        Console.error(
          `❌ Could not find file [${fileName}] in folder [${folderName}]. Make sure the file exists and that the service account has access.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      FileSearchError: (e) =>
        Console.error(
          `❌ Error while searching for file [${fileName}] in folder [${folderName}]. Please check your setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      FolderNotFoundError: (e) =>
        Console.error(
          `❌ Could not find folder [${folderName}]. Make sure the folder exists and that the service account has access.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      FolderSearchError: (e) =>
        Console.error(
          `❌ Error while searching for folder [${folderName}]. Please check your setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      InvalidTabIndexError: (e) =>
        Console.error(
          `❌ Tab index [${e.indexRequested.toString()}] is invalid for file [${fileName}]. Only [${e.totalCount.toString()}] tab(s) available.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      KeyFileNotFoundError: (e) =>
        Console.error(
          `❌ Could not find key file [${e.path}] (${e.source}). Make sure the file exists.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      MissingFileIdError: (e) =>
        Console.error(
          `❌ File [${fileName}] is missing an ID. Please check your Google Drive setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      MissingFolderIdError: (e) =>
        Console.error(
          `❌ Folder [${folderName}] is missing an ID. Please check your Google Drive setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      NoTabDataError: (e) =>
        Console.error(
          `❌ Tab at index [${e.tabIndex.toString()}] in file [${fileName}] does not contain any rows. Add rows to the tab and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      TabsFetchError: (e) =>
        Console.error(
          `❌ Error while fetching tabs for file [${fileName}]. Please check your setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      TabValuesFetchError: (e) =>
        Console.error(
          `❌ Error while fetching values for tab [${e.tabIndex.toString()}] in file [${fileName}]. Please check your setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
    }),
  );

export default handleJobPostingsCommand;
