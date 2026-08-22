import { Context, Effect, FileSystem, Layer } from "effect";
import FilePath from "../helpers/file-path.js";
import FileWriteError from "./file-write-error.js";

/**
 * A service for writing files to disk
 */
class FileWriter extends Context.Service<
  FileWriter,
  {
    /**
     * Writes string data to a file at the given path
     *
     * @param path - Path of the file to write
     * @param data - String data to write to the file
     * @returns An Effect that resolves once the file has been written, or
     * fails if the write errors
     */
    readonly writeFile: (
      path: typeof FilePath.Type,
      data: string,
    ) => Effect.Effect<void, FileWriteError>;
  }
>()("@app/FileWriter") {
  static readonly layer = Layer.effect(
    FileWriter,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;

      const writeFile = (path: typeof FilePath.Type, data: string) =>
        fs.writeFileString(path, data).pipe(
          Effect.mapError((e) => new FileWriteError({ cause: e })),
          Effect.withSpan("file-writer.write-file"),
        );

      return FileWriter.of({ writeFile });
    }),
  );
}

export default FileWriter;
