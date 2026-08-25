import { Runtime, Schema } from "effect";

/**
 * Raised when a sheet was found and fetched successfully but contains no
 * rows
 */
class NoSheetDataError extends Schema.TaggedError<NoSheetDataError>()(
  "NoSheetDataError",
  {
    /** The index of the sheet with no rows */
    sheetIndex: Schema.Natural,
  },
) {
  override get message() {
    return `The sheet at index [${this.sheetIndex.toString()}] does not have any rows`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 33;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default NoSheetDataError;
