import {
  Array,
  Context,
  Duration,
  Effect,
  FileSystem,
  Layer,
  Option,
  Schema,
} from "effect";
import FilePath from "../helpers/file-path.js";
import { Auth, drive_v3, google } from "googleapis";
import FolderName from "../helpers/folder-name.js";
import FileName from "../helpers/file-name.js";
import FolderId from "../helpers/folder-id.js";
import FileId from "../helpers/file-id.js";
import TabIndex from "../helpers/tab-index.js";
import FolderSearchError from "./folder-search-error.js";
import DuplicateFoldersFoundError from "./duplicate-folders-found-error.js";
import FolderNotFoundError from "./folder-not-found-error.js";
import FileSearchError from "./file-search-error.js";
import DuplicateFilesFoundError from "./duplicate-files-found-error.js";
import FileNotFoundError from "./file-not-found-error.js";
import KeyFileReadError from "./key-file-read-error.js";
import TabsFetchError from "./tabs-fetch-error.js";
import InvalidTabIndexError from "./invalid-tab-index-error.js";
import TabValuesFetchError from "./tab-values-fetch-error.js";
import orEmptyArray from "../helpers/or-empty-array.js";
import RequestLabel from "../helpers/request-label.js";
import tryRequest from "../helpers/try-request.js";

const FOLDER_SEARCH = RequestLabel.make("Folder search");
const FILE_SEARCH = RequestLabel.make("File search");
const TABS_FETCH = RequestLabel.make("Tabs fetch");
const TAB_VALUES_FETCH = RequestLabel.make("Tab values fetch");

/**
 * The fields of a Service account key file that `GoogleAuth` needs
 */
const KeyFile = Schema.Struct({
  client_email: Schema.String,
  private_key: Schema.String,
});

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
     * @returns An Effect that resolves to the configured auth client, or
     * fails with {@link KeyFileReadError} when the key file cannot be read or
     * is not a valid service account key file
     */
    readonly getAuth: (
      keyFilePath: typeof FilePath.Type,
    ) => Effect.Effect<Auth.GoogleAuth, KeyFileReadError>;

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
     * Retrieves the values of a single tab from a Google Sheets
     * spreadsheet by its index
     *
     * @param auth - Authenticated Google auth client with Sheets access
     * @param fileId - ID of the spreadsheet file
     * @param tabIndex - Zero-based index of the tab to retrieve
     * @param timeout - Maximum time to wait for each fetch request
     * @returns An Effect that resolves to the tab's values as rows of
     * cells, or fails if either fetch errors or the tab index is out of
     * range
     */
    readonly getTabValues: (
      auth: Auth.GoogleAuth,
      fileId: typeof FileId.Type,
      tabIndex: typeof TabIndex.Type,
      timeout: Duration.Duration,
    ) => Effect.Effect<
      string[][],
      TabsFetchError | InvalidTabIndexError | TabValuesFetchError
    >;
  }
>()("@app/GoogleTools") {
  static readonly layer = Layer.effect(
    GoogleTools,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      // A `JWT` client is passed in as `authClient` because google-auth-library
      // deprecates `GoogleAuth`'s `keyFile` and `credentials` options with a
      // warning on standard error
      const getAuth = Effect.fn("google-tools.get-auth")(function* (
        keyFilePath: typeof FilePath.Type,
      ) {
        const { client_email, private_key } = yield* fs
          .readFileString(keyFilePath)
          .pipe(
            Effect.flatMap(
              Schema.decodeUnknownEffect(Schema.fromJsonString(KeyFile)),
            ),
            Effect.mapError(
              (cause) => new KeyFileReadError({ path: keyFilePath, cause }),
            ),
          );
        return yield* Effect.sync(
          () =>
            new google.auth.GoogleAuth({
              authClient: new google.auth.JWT({
                email: client_email,
                key: private_key,
                scopes: [
                  "https://www.googleapis.com/auth/spreadsheets.readonly",
                  "https://www.googleapis.com/auth/drive.readonly",
                ],
              }),
            }),
        );
      });

      const getFolders = Effect.fn("google-tools.get-folders")(function* (
        auth: Auth.GoogleAuth,
        folderName: typeof FolderName.Type,
        timeout: Duration.Duration,
      ) {
        return yield* tryRequest({
          try: () =>
            google.drive({ version: "v3", auth }).files.list({
              q: `name = "${folderName}" and mimeType = "application/vnd.google-apps.folder" and trashed = false`,
              fields: "files(id, name)",
              pageSize: 10,
            }),
          label: FOLDER_SEARCH,
          toError: (cause) => new FolderSearchError({ cause }),
          timeout,
        }).pipe(Effect.map(({ data }) => orEmptyArray(data.files)));
      });

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

      const getFiles = Effect.fn("google-tools.get-files")(function* (
        auth: Auth.GoogleAuth,
        fileName: typeof FileName.Type,
        folderId: typeof FolderId.Type,
        timeout: Duration.Duration,
      ) {
        return yield* tryRequest({
          try: () =>
            google.drive({ version: "v3", auth }).files.list({
              q: `name = "${fileName}" and mimeType = "application/vnd.google-apps.spreadsheet" and '${folderId}' in parents and trashed = false`,
              fields: "files(id, name)",
              pageSize: 10,
            }),
          label: FILE_SEARCH,
          toError: (cause) => new FileSearchError({ cause }),
          timeout,
        }).pipe(Effect.map(({ data }) => orEmptyArray(data.files)));
      });

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

      const getTabValues = Effect.fn("google-tools.get-tab-values")(function* (
        auth: Auth.GoogleAuth,
        fileId: typeof FileId.Type,
        tabIndex: typeof TabIndex.Type,
        timeout: Duration.Duration,
      ) {
        const sheets = google.sheets({ version: "v4", auth });

        const availableTabs = yield* tryRequest({
          try: () => sheets.spreadsheets.get({ spreadsheetId: fileId }),
          label: TABS_FETCH,
          toError: (cause) => new TabsFetchError({ cause }),
          timeout,
        }).pipe(Effect.map(({ data }) => orEmptyArray(data.sheets)));

        const targetTab = yield* Array.get(availableTabs, tabIndex).pipe(
          Option.match({
            onNone: () =>
              new InvalidTabIndexError({
                indexRequested: tabIndex,
                totalCount: availableTabs.length,
              }),
            onSome: (x) => Effect.succeed(x),
          }),
        );

        return yield* tryRequest({
          try: () =>
            sheets.spreadsheets.values.get({
              spreadsheetId: fileId,
              range: Option.fromNullishOr(targetTab.properties).pipe(
                Option.flatMapNullishOr((properties) => properties.title),
                Option.getOrElse(() => "Sheet1"),
              ),
            }),
          label: TAB_VALUES_FETCH,
          toError: (cause) => new TabValuesFetchError({ tabIndex, cause }),
          timeout,
        }).pipe(Effect.map(({ data }) => orEmptyArray(data.values)));
      });

      return GoogleTools.of({
        getAuth,
        getFolders,
        getFolder,
        getFiles,
        getFile,
        getTabValues,
      });
    }),
  );
}

export default GoogleTools;
