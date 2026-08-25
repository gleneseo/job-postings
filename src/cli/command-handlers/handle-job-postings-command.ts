import { Console, Duration, Effect } from "effect";
import banner from "../banner.js";
import GoogleTools from "../../google/google-tools.js";
import MissingFolderIdError from "../../google/missing-folder-id-error.js";
import FilePath from "../../helpers/file-path.js";
import FolderName from "../../helpers/folder-name.js";
import FileName from "../../helpers/file-name.js";
import FolderId from "../../helpers/folder-id.js";
import SheetIndex from "../../helpers/sheet-index.js";
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
import InvalidSheetIndexError from "../../google/invalid-sheet-index-error.js";
import NoSheetDataError from "../../google/no-sheet-data-error.js";
import SheetFetchError from "../../google/sheet-fetch-error.js";
import SheetValuesFetchError from "../../google/sheet-values-fetch-error.js";

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
  | InvalidSheetIndexError
  | MissingFileIdError
  | MissingFolderIdError
  | NoSheetDataError
  | SheetFetchError
  | SheetValuesFetchError;

/**
 * Authenticates with Google using the given key file, locates the target
 * sheet by folder and file name, sorts its values, and prints them to
 * standard out as CSV, logging progress to standard error along the way
 * and, for a domain error, a human-readable message before failing with it
 *
 * @param keyFilePath - Path to the Google service account JSON key file
 * @param folderName - Name of the Google Drive folder containing the sheet
 * file
 * @param fileName - Name of the sheet file to read
 * @param sheetIndex - Zero-based index of the sheet to read
 * @param output - Path to write the resulting CSV file to
 * @param quiet - When true, suppresses the banner and status messages;
 * runtime errors are still printed
 * @param timeoutSeconds - Network request timeout, in seconds, for each
 * Google API call
 * @returns An effect that resolves once the command has finished, or fails
 * with the {@link JobPostingsError} that stopped it, after logging why
 */
const handleJobPostingsCommand: (
  keyFilePath: typeof FilePath.Type,
  folderName: typeof FolderName.Type,
  fileName: typeof FileName.Type,
  sheetIndex: typeof SheetIndex.Type,
  quiet: boolean,
  timeoutSeconds: typeof TimeoutSeconds.Type,
) => Effect.Effect<void, JobPostingsError, GoogleTools> = (
  keyFilePath,
  folderName,
  fileName,
  sheetIndex,
  quiet,
  timeoutSeconds,
) =>
  Effect.gen(function* () {
    const googleTools = yield* GoogleTools;
    const timeout = Duration.seconds(timeoutSeconds);

    const logStatus = (message: string) =>
      quiet ? Effect.void : Console.error(message);

    if (!quiet && process.stdout.isTTY) {
      yield* Console.log(banner);
    }

    yield* logStatus(`Authenticating with key file [${keyFilePath}].`);
    const auth = yield* googleTools.getAuth(keyFilePath);

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
      `Fetching values for sheet at index [${sheetIndex.toString()}] in file [${fileName}].`,
    );
    const values = yield* googleTools.getSheetValues(
      auth,
      FileId.make(file.id),
      sheetIndex,
      timeout,
    );

    if (!values.length) {
      return yield* new NoSheetDataError({ sheetIndex });
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
      InvalidSheetIndexError: (e) =>
        Console.error(
          `❌ Sheet index [${e.indexRequested.toString()}] is invalid for file [${fileName}]. Only [${e.totalCount.toString()}] sheet(s) available.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      MissingFileIdError: (e) =>
        Console.error(
          `❌ File [${fileName}] is missing an ID. Please check your Google Drive setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      MissingFolderIdError: (e) =>
        Console.error(
          `❌ Folder [${folderName}] is missing an ID. Please check your Google Drive setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      NoSheetDataError: (e) =>
        Console.error(
          `❌ Sheet at index [${e.sheetIndex.toString()}] in file [${fileName}] does not contain any rows. Add rows to the sheet and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      SheetFetchError: (e) =>
        Console.error(
          `❌ Error while fetching sheets for file [${fileName}]. Please check your setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
      SheetValuesFetchError: (e) =>
        Console.error(
          `❌ Error while fetching values for sheet [${e.sheetIndex.toString()}] in file [${fileName}]. Please check your setup and try again.`,
        ).pipe(Effect.andThen(() => Effect.fail(e))),
    }),
  );

export default handleJobPostingsCommand;
