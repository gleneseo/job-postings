import { Runtime, Schema } from "effect";

/**
 * Raised when writing a file to disk fails, wrapping the underlying cause
 */
class FileWriteError extends Schema.TaggedError<FileWriteError>()(
  "FileWriteError",
  {
    /** The underlying error that caused the write to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 40;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default FileWriteError;
