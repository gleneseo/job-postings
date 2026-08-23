import { Schema } from "effect";

/**
 * The network request timeout, in seconds, applied to each Google API call
 */
const TimeoutSeconds = Schema.Natural.pipe(Schema.brand("TimeoutSeconds"));

export default TimeoutSeconds;
