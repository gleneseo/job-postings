import { Command, Flag } from "effect/cli";
import handleGmailCommand from "../command-handlers/handle-gmail-command.js";
import FilePath from "../../helpers/file-path.js";

const credentialsFilePath = Flag.File("credentials-file-path").pipe(
  Flag.withSchema(FilePath),
  Flag.optional,
  Flag.withDescription(
    "The path to the OAuth2 credentials JSON file (default: gleneseo-helpers/gmail.json in $XDG_CONFIG_HOME, or ~/.config if unset)",
  ),
);

const quiet = Flag.Boolean("quiet").pipe(
  Flag.withAlias("q"),
  Flag.withDefault(false),
  Flag.withDescription(
    "Suppress the banner and status messages (default: false)",
  ),
);

const gmailCommand = Command.make(
  "gmail",
  { credentialsFilePath, quiet },
  ({ credentialsFilePath, quiet }) =>
    handleGmailCommand(credentialsFilePath, quiet),
).pipe(
  Command.withDescription(
    "Download emails from your Gmail inbox (placeholder; not implemented yet)",
  ),
);

export default gmailCommand;
