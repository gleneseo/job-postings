import { Runtime, Schema } from "effect";

/**
 * Raised when fetching the tabs of a Google Sheets spreadsheet fails, wrapping
 * the underlying cause (e.g. a network or API error)
 */
class TabsFetchError extends Schema.TaggedError<TabsFetchError>()(
  "TabsFetchError",
  {
    /** The underlying error that caused the fetch to fail */
    cause: Schema.Defect(),
  },
) {
  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 30;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default TabsFetchError;
