import { Effect, FileSystem, Path } from "effect";
import EmailFilesWriteError from "./email-files-write-error.js";
import type Email from "../helpers/email.js";
import planEmailFiles from "../helpers/plan-email-files.js";

/**
 * Writes each email to a file in the given directory, creating the directory
 * if needed
 *
 * @param directory - The directory to write the files to
 * @param emails - The emails to write
 * @returns An effect that resolves once every file is written, or fails with
 * an {@link EmailFilesWriteError}
 */
const saveEmailFiles = Effect.fn("save-email-files")(function* (
  directory: string,
  emails: readonly (typeof Email.Type)[],
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  yield* Effect.gen(function* () {
    yield* fs.makeDirectory(directory, { recursive: true });
    yield* Effect.forEach(planEmailFiles(emails), ({ name, content }) =>
      fs.writeFileString(path.join(directory, name), content),
    );
  }).pipe(
    Effect.mapError((cause) => new EmailFilesWriteError({ directory, cause })),
  );
});

export default saveEmailFiles;
