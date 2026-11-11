import { Schema } from "effect";

/**
 * The name and address of a party to an email
 */
const Person = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
});

/**
 * A Gmail message reduced to the fields this application keeps
 */
const Email = Schema.Struct({
  id: Schema.String,
  from: Person,
  to: Person,
  subject: Schema.String,
  textBody: Schema.String,
  htmlBody: Schema.String,
  /** When Gmail received the message, as an ISO 8601 UTC timestamp */
  receivedAt: Schema.String,
});

export default Email;
