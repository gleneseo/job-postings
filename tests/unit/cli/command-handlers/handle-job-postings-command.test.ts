import { assert, describe, expect, it, vi } from "@effect/vitest";
import { Effect, Layer, Runtime } from "effect";
import { TestConsole } from "effect/testing";
import type { Auth, drive_v3 } from "googleapis";
import handleJobPostingsCommand from "../../../../src/cli/command-handlers/handle-job-postings-command.js";
import banner from "../../../../src/cli/banner.js";
import FolderSearchError from "../../../../src/google/folder-search-error.js";
import FolderNotFoundError from "../../../../src/google/folder-not-found-error.js";
import DuplicateFoldersFoundError from "../../../../src/google/duplicate-folders-found-error.js";
import MissingFolderIdError from "../../../../src/google/missing-folder-id-error.js";
import FileSearchError from "../../../../src/google/file-search-error.js";
import FileNotFoundError from "../../../../src/google/file-not-found-error.js";
import DuplicateFilesFoundError from "../../../../src/google/duplicate-files-found-error.js";
import MissingFileIdError from "../../../../src/google/missing-file-id-error.js";
import SheetFetchError from "../../../../src/google/sheet-fetch-error.js";
import SheetValuesFetchError from "../../../../src/google/sheet-values-fetch-error.js";
import InvalidSheetIndexError from "../../../../src/google/invalid-sheet-index-error.js";
import NoSheetDataError from "../../../../src/google/no-sheet-data-error.js";
import GoogleTools from "../../../../src/google/google-tools.js";
import FileWriter from "../../../../src/file-system/file-writer.js";
import FileWriteError from "../../../../src/file-system/file-write-error.js";
import FilePath from "../../../../src/helpers/file-path.js";
import FolderName from "../../../../src/helpers/folder-name.js";
import FileName from "../../../../src/helpers/file-name.js";
import FolderId from "../../../../src/helpers/folder-id.js";
import FileId from "../../../../src/helpers/file-id.js";
import SheetIndex from "../../../../src/helpers/sheet-index.js";

const fakeAuth = {} as unknown as Auth.GoogleAuth;
const keyFilePath = FilePath.make("/tmp/key.json");
const folderName = FolderName.make("reports");
const fileName = FileName.make("Job Postings");
const sheetIndex = SheetIndex.make(0);
const output = FilePath.make("job-postings.csv");
const quiet = false;
const fakeFolder: drive_v3.Schema$File = { id: "1", name: "reports" };
const fakeFile: drive_v3.Schema$File = { id: "2", name: "Job Postings" };
const fakeValues: string[][] = [["title", "company"]];
const fakeCsv = "title,company";
const msgAuthenticating = `Authenticating with key file [${keyFilePath}].`;
const msgSearchingForFolder = `Searching for folder [${folderName}].`;
const msgSearchingForFile = `Searching for file [${fileName}] in folder [${folderName}].`;
const msgFetchingSheetValues = (index: typeof SheetIndex.Type) =>
  `Fetching values for sheet at index [${index.toString()}] in file [${fileName}].`;
const msgSortingAndWriting = `Sorting and writing values to [${output}].`;

const makeGoogleToolsTestDouble = (overrides: {
  getAuth?: (path: typeof FilePath.Type) => Effect.Effect<Auth.GoogleAuth>;
  getFolder?: (
    auth: Auth.GoogleAuth,
    name: typeof FolderName.Type,
  ) => Effect.Effect<
    drive_v3.Schema$File,
    FolderSearchError | FolderNotFoundError | DuplicateFoldersFoundError
  >;
  getFile?: (
    auth: Auth.GoogleAuth,
    name: typeof FileName.Type,
    folderId: typeof FolderId.Type,
  ) => Effect.Effect<
    drive_v3.Schema$File,
    FileSearchError | FileNotFoundError | DuplicateFilesFoundError
  >;
  getSheetValues?: (
    auth: Auth.GoogleAuth,
    fileId: typeof FileId.Type,
    sheetIndex: typeof SheetIndex.Type,
  ) => Effect.Effect<
    string[][],
    SheetFetchError | InvalidSheetIndexError | SheetValuesFetchError
  >;
}) => ({
  getAuth: vi.fn(overrides.getAuth ?? (() => Effect.succeed(fakeAuth))),
  getFolder: vi.fn(overrides.getFolder ?? (() => Effect.succeed(fakeFolder))),
  getFile: vi.fn(overrides.getFile ?? (() => Effect.succeed(fakeFile))),
  getSheetValues: vi.fn(
    overrides.getSheetValues ?? (() => Effect.succeed(fakeValues)),
  ),
  getFolders: vi.fn(() => Effect.die("not implemented by this test double")),
  getFiles: vi.fn(() => Effect.die("not implemented by this test double")),
});

const makeFileWriterTestDouble = (overrides: {
  writeFile?: (
    path: typeof FilePath.Type,
    data: string,
  ) => Effect.Effect<void, FileWriteError>;
}) => ({
  writeFile: vi.fn(overrides.writeFile ?? (() => Effect.void)),
});

const provideTestDoubles = (
  googleTools: ReturnType<typeof makeGoogleToolsTestDouble>,
  fileWriter: ReturnType<
    typeof makeFileWriterTestDouble
  > = makeFileWriterTestDouble({}),
) =>
  Effect.provide(
    Layer.mergeAll(
      Layer.succeed(GoogleTools, googleTools),
      Layer.succeed(FileWriter, fileWriter),
      TestConsole.layer,
    ),
  );

describe("handleJobPostingsCommand", () => {
  it.effect(
    "should authenticate, search for the folder and file, sort and write the sheet, and print the outcome",
    () =>
      Effect.gen(function* () {
        const googleTools = makeGoogleToolsTestDouble({});
        const fileWriter = makeFileWriterTestDouble({});

        yield* handleJobPostingsCommand(
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
        ).pipe(provideTestDoubles(googleTools, fileWriter));

        expect(googleTools.getAuth).toHaveBeenCalledExactlyOnceWith(
          keyFilePath,
        );
        expect(googleTools.getFolder).toHaveBeenCalledExactlyOnceWith(
          fakeAuth,
          folderName,
        );
        expect(googleTools.getFile).toHaveBeenCalledExactlyOnceWith(
          fakeAuth,
          fileName,
          FolderId.make(fakeFolder.id ?? ""),
        );
        expect(googleTools.getSheetValues).toHaveBeenCalledExactlyOnceWith(
          fakeAuth,
          FileId.make(fakeFile.id ?? ""),
          sheetIndex,
        );
        expect(fileWriter.writeFile).toHaveBeenCalledExactlyOnceWith(
          output,
          fakeCsv,
        );
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingSheetValues(sheetIndex),
          msgSortingAndWriting,
          `Success. File written at [${output}].`,
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
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
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
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
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
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
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
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
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
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
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
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
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
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
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
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
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
    "should fail with a distinct exit code when the sheet has no data rows after logging it",
    () =>
      Effect.gen(function* () {
        const googleTools = makeGoogleToolsTestDouble({
          getSheetValues: () => Effect.succeed([]),
        });

        const failure = yield* handleJobPostingsCommand(
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(new NoSheetDataError({ sheetIndex }));
        expect(Runtime.getErrorExitCode(failure)).toBe(33);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingSheetValues(sheetIndex),
          `❌ Sheet at index [${sheetIndex.toString()}] in file [${fileName}] does not contain any rows. Add rows to the sheet and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on an invalid sheet index after logging it",
    () =>
      Effect.gen(function* () {
        const invalidSheetIndex = SheetIndex.make(1);
        const error = new InvalidSheetIndexError({
          indexRequested: invalidSheetIndex,
          totalCount: 1,
        });
        const googleTools = makeGoogleToolsTestDouble({
          getSheetValues: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          keyFilePath,
          folderName,
          fileName,
          invalidSheetIndex,
          output,
          quiet,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(31);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingSheetValues(invalidSheetIndex),
          `❌ Sheet index [${invalidSheetIndex.toString()}] is invalid for file [${fileName}]. Only [1] sheet(s) available.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a sheet fetch failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new SheetFetchError({
          cause: new Error("network down"),
        });
        const googleTools = makeGoogleToolsTestDouble({
          getSheetValues: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(30);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingSheetValues(sheetIndex),
          `❌ Error while fetching sheets for file [${fileName}]. Please check your setup and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a sheet values fetch failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new SheetValuesFetchError({
          sheetIndex,
          cause: new Error("network down"),
        });
        const googleTools = makeGoogleToolsTestDouble({
          getSheetValues: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
        ).pipe(provideTestDoubles(googleTools), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(32);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingSheetValues(sheetIndex),
          `❌ Error while fetching values for sheet [${sheetIndex.toString()}] in file [${fileName}]. Please check your setup and try again.`,
        ]);
      }),
  );

  it.effect(
    "should fail with a distinct exit code on a file write failure after logging it",
    () =>
      Effect.gen(function* () {
        const error = new FileWriteError({ cause: new Error("disk full") });
        const googleTools = makeGoogleToolsTestDouble({});
        const fileWriter = makeFileWriterTestDouble({
          writeFile: () => Effect.fail(error),
        });

        const failure = yield* handleJobPostingsCommand(
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          quiet,
        ).pipe(provideTestDoubles(googleTools, fileWriter), Effect.flip);

        expect(failure).toStrictEqual(error);
        expect(Runtime.getErrorExitCode(failure)).toBe(40);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          msgAuthenticating,
          msgSearchingForFolder,
          msgSearchingForFile,
          msgFetchingSheetValues(sheetIndex),
          msgSortingAndWriting,
          `❌ Error while writing file to [${output}]. Please check your setup and try again.`,
        ]);
      }),
  );

  it.effect(
    "should print no status messages and still write the file when quiet",
    () =>
      Effect.gen(function* () {
        const googleTools = makeGoogleToolsTestDouble({});
        const fileWriter = makeFileWriterTestDouble({});

        yield* handleJobPostingsCommand(
          keyFilePath,
          folderName,
          fileName,
          sheetIndex,
          output,
          true,
        ).pipe(provideTestDoubles(googleTools, fileWriter));

        expect(fileWriter.writeFile).toHaveBeenCalledExactlyOnceWith(
          output,
          fakeCsv,
        );
        assert.deepStrictEqual(yield* TestConsole.errorLines, []);
      }),
  );

  it.effect("should still print the runtime error message when quiet", () =>
    Effect.gen(function* () {
      const error = new FolderNotFoundError({ folderName });
      const googleTools = makeGoogleToolsTestDouble({
        getFolder: () => Effect.fail(error),
      });

      const failure = yield* handleJobPostingsCommand(
        keyFilePath,
        folderName,
        fileName,
        sheetIndex,
        output,
        true,
      ).pipe(provideTestDoubles(googleTools), Effect.flip);

      expect(failure).toStrictEqual(error);
      assert.deepStrictEqual(yield* TestConsole.errorLines, [
        `❌ Could not find folder [${folderName}]. Make sure the folder exists and that the service account has access.`,
      ]);
    }),
  );

  it.effect(
    "should print the banner on an interactive terminal when not quiet",
    () =>
      Effect.gen(function* () {
        const originalIsTTY = process.stdout.isTTY;
        process.stdout.isTTY = true;
        try {
          const googleTools = makeGoogleToolsTestDouble({});

          yield* handleJobPostingsCommand(
            keyFilePath,
            folderName,
            fileName,
            sheetIndex,
            output,
            false,
          ).pipe(provideTestDoubles(googleTools));

          assert.deepStrictEqual(yield* TestConsole.logLines, [banner]);
        } finally {
          process.stdout.isTTY = originalIsTTY;
        }
      }),
  );

  it.effect(
    "should not print the banner on an interactive terminal when quiet",
    () =>
      Effect.gen(function* () {
        const originalIsTTY = process.stdout.isTTY;
        process.stdout.isTTY = true;
        try {
          const googleTools = makeGoogleToolsTestDouble({});

          yield* handleJobPostingsCommand(
            keyFilePath,
            folderName,
            fileName,
            sheetIndex,
            output,
            true,
          ).pipe(provideTestDoubles(googleTools));

          assert.deepStrictEqual(yield* TestConsole.logLines, []);
        } finally {
          process.stdout.isTTY = originalIsTTY;
        }
      }),
  );

  it.effect(
    "should not print the banner on a non-interactive terminal even when not quiet",
    () =>
      Effect.gen(function* () {
        const originalIsTTY = process.stdout.isTTY;
        process.stdout.isTTY = false;
        try {
          const googleTools = makeGoogleToolsTestDouble({});

          yield* handleJobPostingsCommand(
            keyFilePath,
            folderName,
            fileName,
            sheetIndex,
            output,
            false,
          ).pipe(provideTestDoubles(googleTools));

          assert.deepStrictEqual(yield* TestConsole.logLines, []);
        } finally {
          process.stdout.isTTY = originalIsTTY;
        }
      }),
  );
});
