import { Runtime, Schema } from "effect";

/**
 * Raised when reading from or writing to the SQLite database of downloaded emails fails
 */
class EmailStoreError extends Schema.TaggedError<EmailStoreError>()(
  "EmailStoreError",
  {
    /** The path of the SQLite database */
    path: Schema.NonEmptyString,
    /** The underlying error that caused the operation to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 45;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default EmailStoreError;
