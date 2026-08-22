import { Runtime, Schema } from "effect";

/**
 * Raised when a requested sheet index is outside the range of available
 * sheets
 */
class InvalidSheetIndexError extends Schema.TaggedError<InvalidSheetIndexError>()(
  "InvalidSheetIndexError",
  {
    /** The sheet index that was requested */
    indexRequested: Schema.Natural,
    /** The total number of available sheets */
    totalCount: Schema.Natural,
  },
) {
  override get message() {
    return `Sheet index [${this.indexRequested.toString()}] is invalid; only [${this.totalCount.toString()}] sheet(s) available`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 31;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default InvalidSheetIndexError;
