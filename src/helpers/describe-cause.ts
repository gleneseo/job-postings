/**
 * Describes the underlying cause of a failure in a single line of text
 *
 * @param cause - The cause, typically an `Error` but possibly any thrown value
 * @returns The cause's message if it is an `Error`, otherwise the cause as a
 * string
 */
const describeCause = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

export default describeCause;
