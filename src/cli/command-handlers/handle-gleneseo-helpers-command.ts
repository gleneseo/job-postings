import { Effect } from "effect";
import { CliError } from "effect/cli";
import printBanner from "../print-banner.js";

/**
 * Prints the banner and then shows the application help, since the root
 * command has no behavior of its own beyond listing its subcommands
 *
 * @param quiet - When true, suppresses the banner
 * @returns An effect that fails with a `ShowHelp` error, which the CLI
 * renders as the root command's help
 */
const handleGleneseoHelpersCommand: (
  quiet: boolean,
) => Effect.Effect<void, CliError.ShowHelp> = (quiet) =>
  printBanner(quiet).pipe(
    Effect.andThen(
      Effect.fail(
        new CliError.ShowHelp({
          commandPath: ["gleneseo-helpers"],
          errors: [],
        }),
      ),
    ),
  );

export default handleGleneseoHelpersCommand;
