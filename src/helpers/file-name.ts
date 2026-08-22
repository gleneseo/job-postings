import { Schema } from "effect";

/**
 * The name of a Google Drive spreadsheet file to search for
 */
const FileName = Schema.NonEmptyString.pipe(Schema.brand("FileName"));

export default FileName;
