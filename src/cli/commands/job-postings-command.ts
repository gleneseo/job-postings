import type { Effect } from "effect";
import { Argument, Command, type CliError, Flag } from "effect/unstable/cli";
import handleJobPostingsCommand from "../command-handlers/handle-job-postings-command.js";
import FilePath from "../../helpers/file-path.js";
import FolderName from "../../helpers/folder-name.js";
import FileName from "../../helpers/file-name.js";
import SheetIndex from "../../helpers/sheet-index.js";
import TimeoutSeconds from "../../helpers/timeout-seconds.js";
import packageJson from "../../../package.json" with { type: "json" };

const keyFilePath = Argument.file("key-file-path", { mustExist: true }).pipe(
  Argument.withSchema(FilePath),
  Argument.withDescription("The path to the JSON key file"),
);

const folderName = Flag.string("folder-name").pipe(
  Flag.withSchema(FolderName),
  Flag.withDefault(FolderName.make("Claude")),
  Flag.withDescription(
    'The Google Drive folder that contains the sheet file (default: "Claude")',
  ),
);

const fileName = Flag.string("file-name").pipe(
  Flag.withSchema(FileName),
  Flag.withDefault(FileName.make("Job Postings")),
  Flag.withDescription('The sheet file name (default: "Job Postings")'),
);

const sheetIndex = Flag.integer("sheet-index").pipe(
  Flag.withSchema(SheetIndex),
  Flag.withAlias("i"),
  Flag.withDefault(SheetIndex.make(0)),
  Flag.withDescription("The 0-based index of the target sheet (default: 0)"),
);

const output = Flag.file("output").pipe(
  Flag.withSchema(FilePath),
  Flag.withAlias("o"),
  Flag.withDefault(FilePath.make("job-postings.csv")),
  Flag.withDescription(
    'The path for the file\'s data in CSV format (default: "job-postings.csv")',
  ),
);

const quiet = Flag.boolean("quiet").pipe(
  Flag.withAlias("q"),
  Flag.withDefault(false),
  Flag.withDescription(
    "Suppress status messages; only runtime errors are printed (default: false)",
  ),
);

const timeoutSeconds = Flag.integer("timeout").pipe(
  Flag.filter(
    (n) => n > 0,
    (n) => `--timeout must be greater than 0 seconds (got ${n.toString()})`,
  ),
  Flag.withSchema(TimeoutSeconds),
  Flag.withDefault(TimeoutSeconds.make(5)),
  Flag.withDescription(
    "Network request timeout, in seconds, for each Google API call (default: 5)",
  ),
);

const jobPostingsCommandCore = Command.make(
  "job-postings",
  {
    keyFilePath,
    folderName,
    fileName,
    sheetIndex,
    output,
    quiet,
    timeoutSeconds,
  },
  ({
    keyFilePath,
    folderName,
    fileName,
    sheetIndex,
    output,
    quiet,
    timeoutSeconds,
  }) =>
    handleJobPostingsCommand(
      keyFilePath,
      folderName,
      fileName,
      sheetIndex,
      output,
      quiet,
      timeoutSeconds,
    ),
).pipe(
  Command.withDescription(
    "Sort a Google Sheet's job postings and write them to a CSV file",
  ),
);

type HandlerEffect = ReturnType<typeof handleJobPostingsCommand>;

const helpCommand = Command.make(
  "help",
  {},
  // The return type annotation breaks the type-inference cycle with
  // `jobPostingsCommand`, which is declared below and referenced in the body.
  // Without it, referencing `jobPostingsCommandCore` instead would compile,
  // but would drop "help" from its own SUBCOMMANDS listing.
  (): Effect.Effect<
    void,
    Effect.Error<HandlerEffect> | CliError.CliError,
    Effect.Services<HandlerEffect> | Command.Environment
  > =>
    Command.runWith(jobPostingsCommand, { version: packageJson.version })([
      "--help",
    ]),
).pipe(Command.withDescription("Show the application help"));

const jobPostingsCommand = jobPostingsCommandCore.pipe(
  Command.withSubcommands([helpCommand]),
);

export default jobPostingsCommand;
