import { Console, Effect } from "effect";
import banner from "./banner.js";

/**
 * Prints the banner to standard out, but only on an interactive terminal
 * (stdout is a TTY) and only when not quiet, so it doesn't clutter piped,
 * redirected, or otherwise scripted output
 *
 * @param quiet - When true, the banner is suppressed
 * @returns An effect that resolves once the banner has been printed, or
 * immediately when it is suppressed
 */
const printBanner: (quiet: boolean) => Effect.Effect<void> = (quiet) =>
  Effect.suspend(() =>
    !quiet && process.stdout.isTTY ? Console.log(banner) : Effect.void,
  );

export default printBanner;
