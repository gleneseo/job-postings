import { Runtime, Schema } from "effect";

/**
 * Raised when the Google OAuth client file does not exist, whether it was given explicitly or is the default location
 */
class CredentialsNotFoundError extends Schema.TaggedError<CredentialsNotFoundError>()(
  "CredentialsNotFoundError",
  {
    /** The path that was checked */
    path: Schema.NonEmptyString,
    /** Whether the path is the default location rather than one given explicitly */
    isDefault: Schema.Boolean,
  },
) {
  override get message() {
    return `Credentials file [${this.path}] not found`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 40;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default CredentialsNotFoundError;
