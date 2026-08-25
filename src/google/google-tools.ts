import { Array, Cause, Context, Duration, Effect, Layer, Option } from "effect";
import FilePath from "../helpers/file-path.js";
import { Auth, drive_v3, google } from "googleapis";
import FolderName from "../helpers/folder-name.js";
import FileName from "../helpers/file-name.js";
import FolderId from "../helpers/folder-id.js";
import FileId from "../helpers/file-id.js";
import SheetIndex from "../helpers/sheet-index.js";
import FolderSearchError from "./folder-search-error.js";
import DuplicateFoldersFoundError from "./duplicate-folders-found-error.js";
import FolderNotFoundError from "./folder-not-found-error.js";
import FileSearchError from "./file-search-error.js";
import DuplicateFilesFoundError from "./duplicate-files-found-error.js";
import FileNotFoundError from "./file-not-found-error.js";
import SheetFetchError from "./sheet-fetch-error.js";
import InvalidSheetIndexError from "./invalid-sheet-index-error.js";
import SheetValuesFetchError from "./sheet-values-fetch-error.js";

/**
 * A collection of tools from Google
 */
class GoogleTools extends Context.Service<
  GoogleTools,
  {
    /**
     * Creates a Google service account auth client from a key file, scoped
     * to read-only access to Sheets and Drive
     *
     * @param keyFilePath - Path to the service account key file
     * @returns An Effect that resolves to the configured auth client
     */
    readonly getAuth: (
      keyFilePath: typeof FilePath.Type,
    ) => Effect.Effect<Auth.GoogleAuth>;

    /**
     * Searches Google Drive for non-trashed folders whose name exactly
     * matches the given query
     *
     * @param auth - Authenticated Google auth client with Drive access
     * @param folderName - Exact folder name to search for
     * @param timeout - Maximum time to wait for the search request
     * @returns An Effect that resolves to the matching folders
     */
    readonly getFolders: (
      auth: Auth.GoogleAuth,
      folderName: typeof FolderName.Type,
      timeout: Duration.Duration,
    ) => Effect.Effect<drive_v3.Schema$File[], FolderSearchError>;

    /**
     * Searches Google Drive for a single non-trashed folder whose name
     * exactly matches the given query
     *
     * @param auth - Authenticated Google auth client with Drive access
     * @param folderName - Exact folder name to search for
     * @param timeout - Maximum time to wait for the search request
     * @returns An Effect that resolves to the matching folder, or fails if
     * the search errors, no folder is found, or more than one folder matches
     */
    readonly getFolder: (
      auth: Auth.GoogleAuth,
      folderName: typeof FolderName.Type,
      timeout: Duration.Duration,
    ) => Effect.Effect<
      drive_v3.Schema$File,
      FolderSearchError | FolderNotFoundError | DuplicateFoldersFoundError
    >;

    /**
     * Searches a Google Drive folder for non-trashed spreadsheet files whose
     * name exactly matches the given query
     *
     * @param auth - Authenticated Google auth client with Drive access
     * @param fileName - Exact file name to search for
     * @param folderId - ID of the folder to search within
     * @param timeout - Maximum time to wait for the search request
     * @returns An Effect that resolves to the matching files
     */
    readonly getFiles: (
      auth: Auth.GoogleAuth,
      fileName: typeof FileName.Type,
      folderId: typeof FolderId.Type,
      timeout: Duration.Duration,
    ) => Effect.Effect<drive_v3.Schema$File[], FileSearchError>;

    /**
     * Searches a Google Drive folder for a single non-trashed spreadsheet
     * file whose name exactly matches the given query
     *
     * @param auth - Authenticated Google auth client with Drive access
     * @param fileName - Exact file name to search for
     * @param folderId - ID of the folder to search within
     * @param timeout - Maximum time to wait for the search request
     * @returns An Effect that resolves to the matching file, or fails if
     * the search errors, no file is found, or more than one file matches
     */
    readonly getFile: (
      auth: Auth.GoogleAuth,
      fileName: typeof FileName.Type,
      folderId: typeof FolderId.Type,
      timeout: Duration.Duration,
    ) => Effect.Effect<
      drive_v3.Schema$File,
      FileSearchError | FileNotFoundError | DuplicateFilesFoundError
    >;

    /**
     * Retrieves the values of a single sheet from a Google Sheets
     * spreadsheet by its index
     *
     * @param auth - Authenticated Google auth client with Sheets access
     * @param fileId - ID of the spreadsheet file
     * @param sheetIndex - Zero-based index of the sheet to retrieve
     * @param timeout - Maximum time to wait for each fetch request
     * @returns An Effect that resolves to the sheet's values as rows of
     * cells, or fails if either fetch errors or the sheet index is out of
     * range
     */
    readonly getSheetValues: (
      auth: Auth.GoogleAuth,
      fileId: typeof FileId.Type,
      sheetIndex: typeof SheetIndex.Type,
      timeout: Duration.Duration,
    ) => Effect.Effect<
      string[][],
      SheetFetchError | InvalidSheetIndexError | SheetValuesFetchError
    >;
  }
>()("@app/GoogleTools") {
  static readonly layer = Layer.sync(GoogleTools, () => {
    const getAuth = (keyFilePath: typeof FilePath.Type) =>
      Effect.sync(
        () =>
          new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: [
              "https://www.googleapis.com/auth/spreadsheets.readonly",
              "https://www.googleapis.com/auth/drive.readonly",
            ],
          }),
      ).pipe(Effect.withSpan("google-tools.get-auth"));

    const getFolders = (
      auth: Auth.GoogleAuth,
      folderName: typeof FolderName.Type,
      timeout: Duration.Duration,
    ) =>
      Effect.tryPromise({
        try: async () => {
          const drive = google.drive({ version: "v3", auth });

          const folderResult = await drive.files.list({
            q: `name = "${folderName}" and mimeType = "application/vnd.google-apps.folder" and trashed = false`,
            fields: "files(id, name)",
            pageSize: 10,
          });

          return folderResult.data.files ?? [];
        },
        catch: (e) => new FolderSearchError({ cause: e }),
      }).pipe(
        Effect.timeoutOrElse({
          duration: timeout,
          orElse: () =>
            Effect.fail(
              new FolderSearchError({
                cause: new Cause.TimeoutError(
                  `Folder search timed out after ${Duration.format(timeout)}`,
                ),
              }),
            ),
        }),
        Effect.withSpan("google-tools.get-folders"),
      );

    const getFolder = Effect.fn("google-tools.get-folder")(function* (
      auth: Auth.GoogleAuth,
      folderName: typeof FolderName.Type,
      timeout: Duration.Duration,
    ) {
      const folders = yield* getFolders(auth, folderName, timeout);
      if (folders.length > 1) {
        return yield* DuplicateFoldersFoundError.fromArray(folders);
      }

      return yield* Array.head(folders).pipe(
        Option.match({
          onNone: () => new FolderNotFoundError({ folderName }),
          onSome: (x) => Effect.succeed(x),
        }),
      );
    });

    const getFiles = (
      auth: Auth.GoogleAuth,
      fileName: typeof FileName.Type,
      folderId: typeof FolderId.Type,
      timeout: Duration.Duration,
    ) =>
      Effect.tryPromise({
        try: async () => {
          const drive = google.drive({ version: "v3", auth });

          const searchResult = await drive.files.list({
            q: `name = "${fileName}" and mimeType = "application/vnd.google-apps.spreadsheet" and '${folderId}' in parents and trashed = false`,
            fields: "files(id, name)",
            pageSize: 10,
          });

          return searchResult.data.files ?? [];
        },
        catch: (e) => new FileSearchError({ cause: e }),
      }).pipe(
        Effect.timeoutOrElse({
          duration: timeout,
          orElse: () =>
            Effect.fail(
              new FileSearchError({
                cause: new Cause.TimeoutError(
                  `File search timed out after ${Duration.format(timeout)}`,
                ),
              }),
            ),
        }),
        Effect.withSpan("google-tools.get-files"),
      );

    const getFile = Effect.fn("google-tools.get-file")(function* (
      auth: Auth.GoogleAuth,
      fileName: typeof FileName.Type,
      folderId: typeof FolderId.Type,
      timeout: Duration.Duration,
    ) {
      const files = yield* getFiles(auth, fileName, folderId, timeout);
      if (files.length > 1) {
        return yield* DuplicateFilesFoundError.fromArray(files);
      }

      return yield* Array.head(files).pipe(
        Option.match({
          onNone: () => new FileNotFoundError({ fileName }),
          onSome: (x) => Effect.succeed(x),
        }),
      );
    });

    const getSheetValues = Effect.fn("google-tools.get-sheet-values")(
      function* (
        auth: Auth.GoogleAuth,
        fileId: typeof FileId.Type,
        sheetIndex: typeof SheetIndex.Type,
        timeout: Duration.Duration,
      ) {
        const sheets = google.sheets({ version: "v4", auth });

        const availableSheets = yield* Effect.tryPromise({
          try: async () =>
            sheets.spreadsheets
              .get({ spreadsheetId: fileId })
              .then((x) => x.data.sheets ?? []),
          catch: (e) => new SheetFetchError({ cause: e }),
        }).pipe(
          Effect.timeoutOrElse({
            duration: timeout,
            orElse: () =>
              Effect.fail(
                new SheetFetchError({
                  cause: new Cause.TimeoutError(
                    `Sheet fetch timed out after ${Duration.format(timeout)}`,
                  ),
                }),
              ),
          }),
        );

        const targetSheet = yield* Array.get(availableSheets, sheetIndex).pipe(
          Option.match({
            onNone: () =>
              new InvalidSheetIndexError({
                indexRequested: sheetIndex,
                totalCount: availableSheets.length,
              }),
            onSome: (x) => Effect.succeed(x),
          }),
        );

        return yield* Effect.tryPromise({
          try: async () =>
            sheets.spreadsheets.values
              .get({
                spreadsheetId: fileId,
                range: targetSheet.properties?.title ?? "Sheet1",
              })
              .then((x) => x.data.values ?? []),
          catch: (e) => new SheetValuesFetchError({ sheetIndex, cause: e }),
        }).pipe(
          Effect.timeoutOrElse({
            duration: timeout,
            orElse: () =>
              Effect.fail(
                new SheetValuesFetchError({
                  sheetIndex,
                  cause: new Cause.TimeoutError(
                    `Sheet values fetch timed out after ${Duration.format(timeout)}`,
                  ),
                }),
              ),
          }),
        );
      },
    );

    return GoogleTools.of({
      getAuth,
      getFolders,
      getFolder,
      getFiles,
      getFile,
      getSheetValues,
    });
  });
}

export default GoogleTools;
