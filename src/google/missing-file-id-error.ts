import { Runtime, Schema } from "effect";

/**
 * Raised when a Google Drive file matched by name is missing an ID
 */
class MissingFileIdError extends Schema.TaggedError<MissingFileIdError>()(
  "MissingFileIdError",
  {
    /** The file name whose matched file was missing an ID */
    fileName: Schema.NonEmptyString,
  },
) {
  override get message() {
    return `File [${this.fileName}] is missing an ID`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 23;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default MissingFileIdError;
