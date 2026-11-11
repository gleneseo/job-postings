import { Runtime, Schema } from "effect";

/**
 * Raised when authorizing with Gmail fails, whether reading or writing the cached token or running the browser consent flow
 */
class GmailAuthError extends Schema.TaggedError<GmailAuthError>()(
  "GmailAuthError",
  {
    /** The underlying error that caused the authorization to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 42;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default GmailAuthError;
