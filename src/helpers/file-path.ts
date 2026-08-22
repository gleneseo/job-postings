import { Schema } from "effect";

/**
 * A filesystem path
 */
const FilePath = Schema.NonEmptyString.pipe(Schema.brand("FilePath"));

export default FilePath;
