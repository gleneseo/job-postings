import { assert, describe, expect, it, vi } from "@effect/vitest";
import { Duration, Effect, Layer, Option, Runtime } from "effect";
import { TestConsole } from "effect/testing";
import type { Auth, drive_v3 } from "googleapis";
import handleJobPostingsCommand from "../../../../src/cli/command-handlers/handle-job-postings-command.js";
import FolderSearchError from "../../../../src/google/folder-search-error.js";
import FolderNotFoundError from "../../../../src/google/folder-not-found-error.js";
import DuplicateFoldersFoundError from "../../../../src/google/duplicate-folders-found-error.js";
import MissingFolderIdError from "../../../../src/google/missing-folder-id-error.js";
import FileSearchError from "../../../../src/google/file-search-error.js";
import FileNotFoundError from "../../../../src/google/file-not-found-error.js";
import DuplicateFilesFoundError from "../../../../src/google/duplicate-files-found-error.js";
import MissingFileIdError from "../../../../src/google/missing-file-id-error.js";
import KeyFileReadError from "../../../../src/google/key-file-read-error.js";
import TabsFetchError from "../../../../src/google/tabs-fetch-error.js";
import TabValuesFetchError from "../../../../src/google/tab-values-fetch-error.js";
import InvalidTabIndexError from "../../../../src/google/invalid-tab-index-error.js";
import NoTabDataError from "../../../../src/google/no-tab-data-error.js";
import KeyFileResolver from "../../../../src/config/key-file-resolver.js";
import KeyFileNotFoundError from "../../../../src/config/key-file-not-found-error.js";
import GoogleTools from "../../../../src/google/google-tools.js";
import FilePath from "../../../../src/helpers/file-path.js";
import FolderName from "../../../../src/helpers/folder-name.js";
import FileName from "../../../../src/helpers/file-name.js";
import FolderId from "../../../../src/helpers/folder-id.js";
import FileId from "../../../../src/helpers/file-id.js";
import TabIndex from "../../../../src/helpers/tab-index.js";
import TimeoutSeconds from "../../../../src/helpers/timeout-seconds.js";

const fakeAuth = {} as unknown as Auth.GoogleAuth;
const key = FilePath.make("/tmp/key.json");
const folderName = FolderName.make("reports");
const fileName = FileName.make("Job Postings");
const tabIndex = TabIndex.make(0);
const quiet = false;
const timeoutSeconds = TimeoutSeconds.make(30);
const timeout = Duration.seconds(timeoutSeconds);
const fakeFolder: drive_v3.Schema$File = { id: "1", name: "reports" };
const fakeFile: drive_v3.Schema$File = { id: "2", name: "Job Postings" };
const fakeValues: string[][] = [["title", "company"]];
const fakeCsv = "title,company";
const msgAuthenticating = `Authenticating with key file [${key}] (flag).`;
const msgSearchingForFolder = `Searching for folder [${folderName}].`;
const msgSearchingForFile = `Searching for file [${fileName}] in folder [${folderName}].`;
const msgFetchingTabValues = (index: typeof TabIndex.Type) =>
  `Fetching values for tab at index [${index.toString()}] in file [${fileName}].`;
const msgSorting = `Sorting values from [${fileName}].`;

const makeGoogleToolsTestDouble = (overrides: {
  getAuth?: (
    path: typeof FilePath.Type,
  ) => Effect.Effect<Auth.GoogleAuth, KeyFileReadError>;
  getFolder?: (
    auth: Auth.GoogleAuth,
    name: typeof FolderName.Type,
    timeout: Duration.Duration,
  ) => Effect.Effect<
    drive_v3.Schema$File,
    FolderSearchError | FolderNotFoundError | DuplicateFoldersFoundError
  >;
  getFile?: (
    auth: Auth.GoogleAuth,
    name: typeof FileName.Type,
    folderId: typeof FolderId.Type,
    timeout: Duration.Duration,
  ) => Effect.Effect<
    drive_v3.Schema$File,
    FileSearchError | FileNotFoundError | DuplicateFilesFoundError
  >;
  getTabValues?: (
    auth: Auth.GoogleAuth,
    fileId: typeof FileId.Type,
    tabIndex: typeof TabIndex.Type,
    timeout: Duration.Duration,
  ) => Effect.Effect<
    string[][],
    TabsFetchError | InvalidTabIndexError | TabValuesFetchError
  >;
}) => ({
  getAuth: vi.fn(overrides.getAuth ?? (() => Effect.succeed(fakeAuth))),
  getFolder: vi.fn(overrides.getFolder ?? (() => Effect.succeed(fakeFolder))),
  getFile: vi.fn(overrides.getFile ?? (() => Effect.succeed(fakeFile))),
  getTabValues: vi.fn(
    overrides.getTabValues ?? (() => Effect.succeed(fakeValues)),
  ),
  getFolders: vi.fn(() => Effect.die("not implemented by this test double")),
  getFiles: vi.fn(() => Effect.die("not implemented by this test double")),
});

const makeKeyFileResolverTestDouble = (
  resolve?: (
    explicitPath: Option.Option<typeof FilePath.Type>,
  ) => ReturnType<(typeof KeyFileResolver.Service)["resolve"]>,
) => ({
  resolve: vi.fn(
    resolve ??
      ((explicitPath: Option.Option<typeof FilePath.Type>) =>
        Effect.succeed({
          path: Option.getOrElse(explicitPath, () => key),
          source: Option.isSome(explicitPath)
            ? ("flag" as const)
            : ("well-known location" as const),
        })),
  ),
});

const provideTestDoubles = (
  googleTools: ReturnType<typeof makeGoogleToolsTestDouble>,
  keyFileResolver: ReturnType<
    typeof makeKeyFileResolverTestDouble
  > = makeKeyFileResolverTestDouble(),
) =>
  Effect.provide(
    Layer.mergeAll(
      Layer.succeed(GoogleTools, googleTools),
      Layer.succeed(KeyFileResolver, keyFileResolver),
      TestConsole.layer,
    ),
  );

describe("handleJobPostingsCommand", () => {
  it.effect(
    "should authenticate, search for the folder and file, sort the tab, and print the outcome as CSV to standard out",
    () =>
      Effect.gen(function* () {
        const googleTools = makeGoogleToolsTestDouble({});

        yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools));

        expect(googleTools.getAuth).toHaveBeenCalledExactlyOnceWith(key);
        expect(googleTools.getFolder).toHaveBeenCalledExactlyOnceWith(
          fakeAuth,
          folderName,
          timeout,
        );
        expect(googleTools.getFile).toHaveBeenCalledExactlyOnceWith(
          fakeAuth,
          fileName,
          FolderId.make(fakeFolder.id ?? ""),
          timeout,
        );
        expect(googleTools.getTabValues).toHaveBeenCalledExactlyOnceWith(
          fakeAuth,
          FileId.make(fakeFile.id ?? ""),
          tabIndex,
          timeout,
        );
        assert.deepStrictEqual(yield* TestConsole.logLines, [fakeCsv]);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingTabValues(tabIndex),
          msgSorting,
          "Success.",
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a missing folder ID after logging it and without searching for the file",
    () =>
      Effect.gen(function* () {
        const folderWithoutId: drive_v3.Schema$File = { name: "reports" };
        const googleTools = makeGoogleToolsTestDouble({
          getFolder: () => Effect.succeed(folderWithoutId),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(googleTools.getFile).not.toHaveBeenCalled();
        expect(failure).toStrictEqual(new MissingFolderIdError({ folderName }));
        expect(Runtime.getErrorExitCode(failure)).toBe(13);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          `❌ Folder [${folderName}] is missing an ID. Please check your Google Drive setup and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a folder search failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new FolderSearchError({
          cause: new Error("network down"),
        });
        const googleTools = makeGoogleToolsTestDouble({
          getFolder: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(10);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          `❌ Error while searching for folder [${folderName}]. Please check your setup and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a folder not found error after logging it",
    () =>
      Effect.gen(function* () {
        const error = new FolderNotFoundError({ folderName });
        const googleTools = makeGoogleToolsTestDouble({
          getFolder: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(11);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          `❌ Could not find folder [${folderName}]. Make sure the folder exists and that the service account has access.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a duplicate folders found error after logging it",
    () =>
      Effect.gen(function* () {
        const error = DuplicateFoldersFoundError.fromArray([
          { id: "1", name: "reports" },
          { id: "2", name: "reports" },
        ]);
        const googleTools = makeGoogleToolsTestDouble({
          getFolder: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(12);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          `❌ Multiple folders found for [${folderName}]. The folder name must be unique.`,
          error.duplicates,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a file search failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new FileSearchError({
          cause: new Error("network down"),
        });
        const googleTools = makeGoogleToolsTestDouble({
          getFile: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(20);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          `❌ Error while searching for file [${fileName}] in folder [${folderName}]. Please check your setup and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a file not found error after logging it",
    () =>
      Effect.gen(function* () {
        const error = new FileNotFoundError({ fileName });
        const googleTools = makeGoogleToolsTestDouble({
          getFile: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(21);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          `❌ Could not find file [${fileName}] in folder [${folderName}]. Make sure the file exists and that the service account has access.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a duplicate files found error after logging it",
    () =>
      Effect.gen(function* () {
        const error = DuplicateFilesFoundError.fromArray([
          { id: "1", name: "Job Postings" },
          { id: "2", name: "Job Postings" },
        ]);
        const googleTools = makeGoogleToolsTestDouble({
          getFile: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(22);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          `❌ Multiple files found for [${fileName}] in folder [${folderName}]. The file name must be unique.`,
          error.duplicates,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a missing file ID after logging it",
    () =>
      Effect.gen(function* () {
        const fileWithoutId: drive_v3.Schema$File = { name: "Job Postings" };
        const googleTools = makeGoogleToolsTestDouble({
          getFile: () => Effect.succeed(fileWithoutId),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(new MissingFileIdError({ fileName }));
        expect(Runtime.getErrorExitCode(failure)).toBe(23);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          `❌ File [${fileName}] is missing an ID. Please check your Google Drive setup and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code when the tab has no data rows after logging it",
    () =>
      Effect.gen(function* () {
        const googleTools = makeGoogleToolsTestDouble({
          getTabValues: () => Effect.succeed([]),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);
        expect(failure).toStrictEqual(new NoTabDataError({ tabIndex }));
        expect(Runtime.getErrorExitCode(failure)).toBe(33);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingTabValues(tabIndex),
          `❌ Tab at index [${tabIndex.toString()}] in file [${fileName}] does not contain any rows. Add rows to the tab and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on an invalid tab index after logging it",
    () =>
      Effect.gen(function* () {
        const invalidTabIndex = TabIndex.make(1);
        const error = new InvalidTabIndexError({
          indexRequested: invalidTabIndex,
          totalCount: 1,
        });
        const googleTools = makeGoogleToolsTestDouble({
          getTabValues: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          invalidTabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(31);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingTabValues(invalidTabIndex),
          `❌ Tab index [${invalidTabIndex.toString()}] is invalid for file [${fileName}]. Only [1] tab(s) available.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a tabs fetch failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new TabsFetchError({
          cause: new Error("network down"),
        });
        const googleTools = makeGoogleToolsTestDouble({
          getTabValues: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(30);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingTabValues(tabIndex),
          `❌ Error while fetching tabs for file [${fileName}]. Please check your setup and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a tab values fetch failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new TabValuesFetchError({
          tabIndex,
          cause: new Error("network down"),
        });
        const googleTools = makeGoogleToolsTestDouble({
          getTabValues: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(32);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingTabValues(tabIndex),
          `❌ Error while fetching values for tab [${tabIndex.toString()}] in file [${fileName}]. Please check your setup and try again.`,
        ]);
      }),
  );

  it.effect("should not log status messages when quiet", () =>
    Effect.gen(function* () {
      const googleTools = makeGoogleToolsTestDouble({});

      yield* handleJobPostingsCommand(
        Option.some(key),
        folderName,
        fileName,
        tabIndex,
        true,
        timeoutSeconds,
      ).pipe(provideTestDoubles(googleTools));

      assert.deepStrictEqual(yield* TestConsole.logLines, [fakeCsv]);
      assert.deepStrictEqual(yield* TestConsole.errorLines, []);
    }),
  );

  it.effect(
    "should fail with a distinct exit code on a key file read failure after logging it and without searching for the folder",
    () =>
      Effect.gen(function* () {
        const error = new KeyFileReadError({
          path: key,
          cause: new Error("not JSON"),
        });
        const googleTools = makeGoogleToolsTestDouble({
          getAuth: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(43);
        expect(googleTools.getFolder).not.toHaveBeenCalled();
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          `❌ Could not read key file [${key}]. Make sure it is a valid service account key file.`,
        ]);
      }),
  );

  it.effect(
    "should resolve the key file from the well-known location when none is given",
    () =>
      Effect.gen(function* () {
        const googleTools = makeGoogleToolsTestDouble({});
        const keyFileResolver = makeKeyFileResolverTestDouble();

        yield* handleJobPostingsCommand(
          Option.none(),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools, keyFileResolver));

        expect(keyFileResolver.resolve).toHaveBeenCalledExactlyOnceWith(
          Option.none(),
        );
        expect(googleTools.getAuth).toHaveBeenCalledExactlyOnceWith(key);
        assert.include(
          yield* TestConsole.errorLines,
          `Authenticating with key file [${key}] (well-known location).`,
        );
      }),
  );

  it.effect(
    "should log the failure and fail with KeyFileNotFoundError when the key file is missing",
    () =>
      Effect.gen(function* () {
        const googleTools = makeGoogleToolsTestDouble({});
        const error = new KeyFileNotFoundError({
          path: key,
          source: "flag",
        });
        const keyFileResolver = makeKeyFileResolverTestDouble(() =>
          Effect.fail(error),
        );

        const result = yield* handleJobPostingsCommand(
          Option.some(key),
          folderName,
          fileName,
          tabIndex,
          quiet,
          timeoutSeconds,
        ).pipe(provideTestDoubles(googleTools, keyFileResolver), Effect.flip);

        assert.strictEqual(result, error);
        expect(googleTools.getAuth).not.toHaveBeenCalled();
        assert.include(
          yield* TestConsole.errorLines,
          `❌ Could not find key file [${key}] (flag). Make sure the file exists.`,
        );
      }),
  );
});
