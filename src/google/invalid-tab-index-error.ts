import { Runtime, Schema } from "effect";
import TabIndex from "../helpers/tab-index.js";

/**
 * Raised when a requested tab index is outside the range of available
 * tabs
 */
class InvalidTabIndexError extends Schema.TaggedError<InvalidTabIndexError>()(
  "InvalidTabIndexError",
  {
    /** The tab index that was requested */
    indexRequested: TabIndex,
    /** The total number of available tabs */
    totalCount: Schema.Natural,
  },
) {
  override get message() {
    return `Tab index [${this.indexRequested.toString()}] is invalid; only [${this.totalCount.toString()}] tab(s) available`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 31;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default InvalidTabIndexError;
