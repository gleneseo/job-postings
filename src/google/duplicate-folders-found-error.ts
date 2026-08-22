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
 * Raised when a Google Drive folder search by name matches more than one
 * folder, making the match ambiguous
 */
class DuplicateFoldersFoundError extends Schema.TaggedError<DuplicateFoldersFoundError>()(
  "DuplicateFoldersFoundError",
  {
    /** The two or more folders that matched the search */
    duplicates: AtLeastTwoItemsArray,
  },
) {
  /**
   * Builds a {@link DuplicateFoldersFoundError} from the raw Drive API file
   * list, extracting only the `id` and `name` of each duplicate
   *
   * @param files - The Drive files that were found to be duplicates
   * @returns A new {@link DuplicateFoldersFoundError} instance
   */
  static readonly fromArray = (files: drive_v3.Schema$File[]) =>
    new DuplicateFoldersFoundError({
      duplicates: AtLeastTwoItemsArray.make(
        files.map((x) => ({ id: x.id, name: x.name })),
      ),
    });

  /** Read by NodeRuntime's default teardown to set the process exit code */
  override readonly [Runtime.errorExitCode] = 12;

  /** Already logged with a human-readable message; skip NodeRuntime's default error log */
  override readonly [Runtime.errorReported] = false;
}

export default DuplicateFoldersFoundError;
