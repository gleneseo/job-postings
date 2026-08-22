import { Runtime, Schema } from "effect";

/**
 * Raised when a Google Sheets values fetch request fails, wrapping the
 * underlying cause (e.g. a network or API error)
 */
class SheetValuesFetchError extends Schema.TaggedError<SheetValuesFetchError>()(
  "SheetValuesFetchError",
  {
    /** The index of the sheet whose values failed to fetch */
    sheetIndex: Schema.Natural,
    /** The underlying error that caused the fetch to fail */
    cause: Schema.Defect(),
  },
) {
  override get message() {
    return `Failed to fetch values for sheet [${this.sheetIndex.toString()}]`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 32;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default SheetValuesFetchError;
