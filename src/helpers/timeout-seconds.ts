import { Schema } from "effect";

/**
 * The timeout, in seconds, applied to each network request
 */
const TimeoutSeconds = Schema.Natural.pipe(Schema.brand("TimeoutSeconds"));

export default TimeoutSeconds;
