import { Runtime, Schema } from "effect";

/**
 * Raised when the Google OAuth client file cannot be read or is not a valid OAuth client file
 */
class CredentialsReadError extends Schema.TaggedError<CredentialsReadError>()(
  "CredentialsReadError",
  {
    /** The path of the credentials file */
    path: Schema.NonEmptyString,
    /** The underlying error that caused the read to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 41;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default CredentialsReadError;
