import { Effect } from "effect";
import { type CliError, Command, Flag } from "effect/cli";
import handleGleneseoHelpersCommand from "../command-handlers/handle-gleneseo-helpers-command.js";
import handleJobPostingsCommand from "../command-handlers/handle-job-postings-command.js";
import printBanner from "../print-banner.js";
import jobPostingsCommand from "./job-postings-command.js";
import packageJson from "../../../package.json" with { type: "json" };

const quiet = Flag.Boolean("quiet").pipe(
  Flag.withAlias("q"),
  Flag.withDefault(false),
  Flag.withDescription("Suppress the banner (default: false)"),
);

type JobPostingsHandlerEffect = ReturnType<typeof handleJobPostingsCommand>;

const helpCommand = Command.make(
  "help",
  {},
  // The return type annotation breaks the type-inference cycle with
  // `gleneseoHelpersCommand`, which is declared below and referenced in the
  // body.
  (): Effect.Effect<
    void,
    Effect.Error<JobPostingsHandlerEffect> | CliError.CliError,
    Effect.Services<JobPostingsHandlerEffect> | Command.Environment
  > =>
    printBanner(false).pipe(
      Effect.andThen(
        Command.runWith(gleneseoHelpersCommand, {
          version: packageJson.version,
        })(["--help"]),
      ),
    ),
).pipe(Command.withDescription("Show the application help"));

const gleneseoHelpersCommand = Command.make(
  "gleneseo-helpers",
  { quiet },
  ({ quiet }) => handleGleneseoHelpersCommand(quiet),
).pipe(
  Command.withDescription("A collection of Gleneseo helper commands"),
  Command.withSubcommands([jobPostingsCommand, helpCommand]),
);

export default gleneseoHelpersCommand;
