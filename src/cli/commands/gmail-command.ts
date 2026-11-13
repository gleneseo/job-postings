import { Command, Flag } from "effect/cli";
import handleGmailCommand from "../command-handlers/handle-gmail-command.js";

const quiet = Flag.Boolean("quiet").pipe(
  Flag.withAlias("q"),
  Flag.withDefault(false),
  Flag.withDescription("Suppress the banner (default: false)"),
);

const gmailCommand = Command.make("gmail", { quiet }, ({ quiet }) =>
  handleGmailCommand(quiet),
).pipe(
  Command.withDescription(
    "Download emails from your Gmail inbox (placeholder; not implemented yet)",
  ),
);

export default gmailCommand;
