import { Runtime, Schema } from "effect";

/**
 * Raised when a Google Drive search for a folder by name returns no
 * matching folders
 */
class FolderNotFoundError extends Schema.TaggedError<FolderNotFoundError>()(
  "FolderNotFoundError",
  {
    /** The folder name that was searched for and not found */
    folderName: Schema.NonEmptyString,
  },
) {
  override get message() {
    return `Folder [${this.folderName}] not found`;
  }

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 11;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default FolderNotFoundError;
