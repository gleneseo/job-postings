import { Runtime, Schema } from "effect";

/**
 * Raised when fetching or parsing a single Gmail message fails
 */
class GmailFetchError extends Schema.TaggedError<GmailFetchError>()(
  "GmailFetchError",
  {
    /** The ID of the Gmail message that could not be fetched */
    messageId: Schema.NonEmptyString,
    /** The underlying error that caused the fetch to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 44;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default GmailFetchError;
