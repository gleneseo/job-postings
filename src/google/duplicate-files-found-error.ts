import { Runtime, Schema } from "effect";
import { drive_v3 } from "googleapis";

const Item = Schema.Struct({
  id: Schema.NullishOr(Schema.String),
  name: Schema.NullishOr(Schema.String),
});

const AtLeastTwoItemsArray = Schema.Array(Item)
  .check(Schema.isMinLength(2))
  .pipe(Schema.brand("AtLeastTwoItemsArray"));

/**
 * Raised when a Google Drive file search by name matches more than one
 * file, making the match ambiguous
 */
class DuplicateFilesFoundError extends Schema.TaggedError<DuplicateFilesFoundError>()(
  "DuplicateFilesFoundError",
  {
    /** The two or more files that matched the search */
    duplicates: AtLeastTwoItemsArray,
  },
) {
  /**
   * Builds a {@link DuplicateFilesFoundError} from the raw Drive API file
   * list, extracting only the `id` and `name` of each duplicate
   *
   * @param files - The Drive files that were found to be duplicates
   * @returns A new {@link DuplicateFilesFoundError} instance
   */
  static readonly fromArray = (files: drive_v3.Schema$File[]) =>
    new DuplicateFilesFoundError({
      duplicates: AtLeastTwoItemsArray.make(
        files.map((x) => ({ id: x.id, name: x.name })),
      ),
    });

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 22;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default DuplicateFilesFoundError;
