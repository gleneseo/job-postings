import { Schema } from "effect";

/**
 * The ID of a Google Drive file
 */
const FileId = Schema.NonEmptyString.pipe(Schema.brand("FileId"));

export default FileId;
