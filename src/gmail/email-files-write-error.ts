import { Runtime, Schema } from "effect";

/**
 * Raised when writing the downloaded emails to files fails
 */
class EmailFilesWriteError extends Schema.TaggedError<EmailFilesWriteError>()(
  "EmailFilesWriteError",
  {
    /** The directory the files were being written to */
    directory: Schema.NonEmptyString,
    /** The underlying error that caused the write to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 46;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default EmailFilesWriteError;
