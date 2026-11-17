import { Runtime, Schema } from "effect";
import FilePath from "../helpers/file-path.js";

/**
 * Raised when the Service account key file cannot be read or is not a valid
 * service account key file
 */
class KeyFileReadError extends Schema.TaggedError<KeyFileReadError>()(
  "KeyFileReadError",
  {
    /** The path of the key file */
    path: FilePath,
    /** The underlying error that caused the read to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 43;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default KeyFileReadError;
