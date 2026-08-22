import { Schema } from "effect";

/**
 * The ID of a Google Drive folder
 */
const FolderId = Schema.NonEmptyString.pipe(Schema.brand("FolderId"));

export default FolderId;
