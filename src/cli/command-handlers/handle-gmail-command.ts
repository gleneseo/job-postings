import { Console, Effect } from "effect";
import printBanner from "../print-banner.js";

/**
 * Prints the banner and a placeholder message to standard error, since the
 * `gmail` helper has no behavior yet
 *
 * @param quiet - When true, suppresses the banner
 * @returns An effect that resolves once the placeholder message has been
 * printed
 */
const handleGmailCommand: (quiet: boolean) => Effect.Effect<void> = Effect.fn(
  "gmail-command",
)(function* (quiet) {
  yield* printBanner(quiet);
  yield* Console.error("The gmail helper is not implemented yet.");
});

export default handleGmailCommand;
