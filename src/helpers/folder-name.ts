import { Schema } from "effect";

/**
 * The name of a Google Drive folder to search for
 */
const FolderName = Schema.NonEmptyString.pipe(Schema.brand("FolderName"));

export default FolderName;
