import { Runtime, Schema } from "effect";

/**
 * Raised when listing the Gmail messages that match a search query fails
 */
class GmailListError extends Schema.TaggedError<GmailListError>()(
  "GmailListError",
  {
    /** The underlying error that caused the listing to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 43;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default GmailListError;
