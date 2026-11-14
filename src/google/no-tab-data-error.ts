import { Runtime, Schema } from "effect";

/**
 * Raised when a tab was found and fetched successfully but contains no
 * rows
 */
class NoTabDataError extends Schema.TaggedError<NoTabDataError>()(
  "NoTabDataError",
  {
    /** The index of the tab with no rows */
    tabIndex: Schema.Natural,
  },
) {
  override get message() {
    return `The tab at index [${this.tabIndex.toString()}] does not have any rows`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 33;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default NoTabDataError;
