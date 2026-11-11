import { Schema } from "effect";

/**
 * An email address or a domain to search for in the `from:` field of Gmail
 * messages (e.g. `jobs@example.com` or `example.com`)
 */
const Sender = Schema.NonEmptyString.pipe(Schema.brand("Sender"));

export default Sender;
