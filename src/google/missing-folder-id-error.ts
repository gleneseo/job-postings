import { Runtime, Schema } from "effect";

/**
 * Raised when a Google Drive folder matched by name is missing an ID
 */
class MissingFolderIdError extends Schema.TaggedError<MissingFolderIdError>()(
  "MissingFolderIdError",
  {
    /** The folder name whose matched folder was missing an ID */
    folderName: Schema.NonEmptyString,
  },
) {
  override get message() {
    return `Folder [${this.folderName}] is missing an ID`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 13;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default MissingFolderIdError;
