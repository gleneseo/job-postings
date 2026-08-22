import { describe, expect, it, vi } from "@effect/vitest";
import { Effect, FileSystem, Layer, PlatformError } from "effect";
import FileWriter from "../../../src/file-system/file-writer.js";
import FilePath from "../../../src/helpers/file-path.js";

const provideFileSystem = (fileSystem: FileSystem.FileSystem) =>
  Effect.provide(
    FileWriter.layer.pipe(
      Layer.provide(Layer.succeed(FileSystem.FileSystem, fileSystem)),
    ),
  );

describe("FileWriter", () => {
  it.effect("should write the given data to the file at the given path", () => {
    const path = FilePath.make("./output.csv");
    const data = "Company,Role\nAcme,Engineer";
    const writeFileString = vi.fn(() => Effect.void);
    const fileSystem = FileSystem.makeNoop({ writeFileString });

    return Effect.gen(function* () {
      const fileWriter = yield* FileWriter;
      yield* fileWriter.writeFile(path, data);

      expect(writeFileString).toHaveBeenCalledExactlyOnceWith(path, data);
    }).pipe(provideFileSystem(fileSystem));
  });

  it.effect(
    "should fail with a FileWriteError when the underlying write fails",
    () => {
      const path = FilePath.make("./output.csv");
      const data = "Company,Role\nAcme,Engineer";
      const cause = PlatformError.badArgument({
        module: "FileSystem",
        method: "writeFileString",
      });
      const fileSystem = FileSystem.makeNoop({
        writeFileString: () => Effect.fail(cause),
      });

      return Effect.gen(function* () {
        const fileWriter = yield* FileWriter;
        const error = yield* Effect.flip(fileWriter.writeFile(path, data));

        expect(error._tag).toBe("FileWriteError");
        expect(error.cause).toBe(cause);
      }).pipe(provideFileSystem(fileSystem));
    },
  );
});
