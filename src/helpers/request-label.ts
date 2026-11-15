import { Schema } from "effect";

/**
 * A short name for a network request, used in its timeout message
 * (e.g. `Folder search` in "Folder search timed out after 30s")
 */
const RequestLabel = Schema.NonEmptyString.pipe(Schema.brand("RequestLabel"));

export default RequestLabel;
