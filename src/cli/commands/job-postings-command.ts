import { Command, Flag } from "effect/cli";
import handleJobPostingsCommand from "../command-handlers/handle-job-postings-command.js";
import FilePath from "../../helpers/file-path.js";
import FolderName from "../../helpers/folder-name.js";
import FileName from "../../helpers/file-name.js";
import TabIndex from "../../helpers/tab-index.js";
import TimeoutSeconds from "../../helpers/timeout-seconds.js";
import timeoutFlag from "./helpers/timeout-flag.js";

const key = Flag.File("key").pipe(
  Flag.withSchema(FilePath),
  Flag.withAlias("k"),
  Flag.optional,
  Flag.withDescription(
    "The path to the JSON key file (default: gleneseo-helpers/job-postings.json in $XDG_CONFIG_HOME, or ~/.config if unset)",
  ),
);

const folderName = Flag.String("folder").pipe(
  Flag.withSchema(FolderName),
  Flag.withDefault(FolderName.make("Claude")),
  Flag.withDescription(
    'The Google Drive folder that contains the Job Postings sheet (default: "Claude")',
  ),
);

const fileName = Flag.String("file").pipe(
  Flag.withSchema(FileName),
  Flag.withDefault(FileName.make("Job Postings")),
  Flag.withDescription(
    'The file name of the Job Postings sheet (default: "Job Postings")',
  ),
);

const tabIndex = Flag.Int("tab").pipe(
  Flag.withSchema(TabIndex),
  Flag.withAlias("t"),
  Flag.withDefault(TabIndex.make(0)),
  Flag.withDescription("The 0-based position of the tab to read (default: 0)"),
);

const quiet = Flag.Boolean("quiet").pipe(
  Flag.withAlias("q"),
  Flag.withDefault(false),
  Flag.withDescription(
    "Suppress status messages; only runtime errors are printed (default: false)",
  ),
);

const timeoutSeconds = timeoutFlag(TimeoutSeconds.make(5), "Google");

const jobPostingsCommand = Command.make(
  "job-postings",
  {
    key,
    folderName,
    fileName,
    tabIndex,
    quiet,
    timeoutSeconds,
  },
  ({ key, folderName, fileName, tabIndex, quiet, timeoutSeconds }) =>
    handleJobPostingsCommand(
      key,
      folderName,
      fileName,
      tabIndex,
      quiet,
      timeoutSeconds,
    ),
).pipe(
  Command.withDescription(
    "Sort a Google Sheet's job postings and print them to standard out as CSV",
  ),
);

export default jobPostingsCommand;
