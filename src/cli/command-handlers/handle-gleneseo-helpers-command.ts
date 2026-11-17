import { Effect } from "effect";
import { CliError } from "effect/cli";
import printBanner from "../print-banner.js";

/**
 * Prints the banner and then shows the application help, since the root
 * command has no behavior of its own beyond listing its subcommands
 *
 * @returns An effect that fails with a `ShowHelp` error, which the CLI
 * renders as the root command's help
 */
const handleGleneseoHelpersCommand: () => Effect.Effect<
  void,
  CliError.ShowHelp
> = () =>
  printBanner(false).pipe(
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
