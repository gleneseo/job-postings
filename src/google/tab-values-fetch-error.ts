import { Runtime, Schema } from "effect";

/**
 * Raised when fetching the values of a tab fails, wrapping the
 * underlying cause (e.g. a network or API error)
 */
class TabValuesFetchError extends Schema.TaggedError<TabValuesFetchError>()(
  "TabValuesFetchError",
  {
    /** The index of the tab whose values failed to fetch */
    tabIndex: Schema.Natural,
    /** The underlying error that caused the fetch to fail */
    cause: Schema.Defect(),
  },
) {
  override get message() {
    return `Failed to fetch values for tab [${this.tabIndex.toString()}]`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 32;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default TabValuesFetchError;
