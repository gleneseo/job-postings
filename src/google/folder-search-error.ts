import { Runtime, Schema } from "effect";

/**
 * Raised when a Google Drive folder search request fails, wrapping the
 * underlying cause (e.g. a network or API error)
 */
class FolderSearchError extends Schema.TaggedError<FolderSearchError>()(
  "FolderSearchError",
  {
    /** The underlying error that caused the search to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 10;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default FolderSearchError;
