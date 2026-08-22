import { Runtime, Schema } from "effect";

/**
 * Raised when a Google Drive search for a file by name returns no
 * matching files
 */
class FileNotFoundError extends Schema.TaggedError<FileNotFoundError>()(
  "FileNotFoundError",
  {
    /** The file name that was searched for and not found */
    fileName: Schema.NonEmptyString,
  },
) {
  override get message() {
    return `File [${this.fileName}] not found`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 21;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default FileNotFoundError;
