import { Runtime, Schema } from "effect";

/**
 * Raised when the Google OAuth2 credentials file does not exist as a
 * regular file at the resolved path
 */
class CredentialsFileNotFoundError extends Schema.TaggedError<CredentialsFileNotFoundError>()(
  "CredentialsFileNotFoundError",
  {
    /** The path that was checked and not found */
    path: Schema.NonEmptyString,
    /** Whether the path was given explicitly or is the well-known location */
    source: Schema.Literals(["flag", "well-known location"]),
  },
) {
  override get message() {
    return `OAuth2 credentials file [${this.path}] from the ${this.source} not found`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 41;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default CredentialsFileNotFoundError;
