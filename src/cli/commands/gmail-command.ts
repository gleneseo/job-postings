import { Command, Flag } from "effect/cli";
import handleGmailCommand from "../command-handlers/handle-gmail-command.js";
import FilePath from "../../helpers/file-path.js";
import Sender from "../../helpers/sender.js";
import TimeoutSeconds from "../../helpers/timeout-seconds.js";
import timeoutFlag from "./helpers/timeout-flag.js";

const senders = Flag.String("sender").pipe(
  Flag.withSchema(Sender),
  Flag.withAlias("s"),
  Flag.atLeast(0),
  Flag.withDescription(
    "An email address or domain to download emails from (e.g. ziprecruiter.com); repeat for several senders; omit to download every inbox email",
  ),
);

const credentials = Flag.File("credentials").pipe(
  Flag.withSchema(FilePath),
  Flag.withAlias("c"),
  Flag.optional,
  Flag.withDescription(
    "The path to the OAuth2 credentials JSON file (default: gleneseo-helpers/gmail.json in $XDG_CONFIG_HOME, or ~/.config if unset)",
  ),
);

const database = Flag.File("database").pipe(
  Flag.withSchema(FilePath),
  Flag.withAlias("d"),
  Flag.optional,
  Flag.withDescription(
    "The SQLite file to write emails to (default: gleneseo-helpers/gmail.sqlite in $XDG_DATA_HOME, or ~/.local/share if unset)",
  ),
);

const token = Flag.File("token").pipe(
  Flag.withSchema(FilePath),
  Flag.withAlias("t"),
  Flag.optional,
  Flag.withDescription(
    "Where to cache the OAuth token (default: gleneseo-helpers/gmail-token.json in $XDG_DATA_HOME, or ~/.local/share if unset)",
  ),
);

const output = Flag.String("output").pipe(
  Flag.withSchema(FilePath),
  Flag.withOptionalValue("output"),
  Flag.optional,
  Flag.withDescription(
    "Also save each email as <Gmail message ID> - <subject>.txt (.html if it has only an HTML body) in a directory, including emails already in the database; give it as --output=<dir> (default: output)",
  ),
);

const quiet = Flag.Boolean("quiet").pipe(
  Flag.withAlias("q"),
  Flag.withDefault(false),
  Flag.withDescription(
    "Suppress the banner and status messages (default: false)",
  ),
);

const timeoutSeconds = timeoutFlag(TimeoutSeconds.make(10), "Gmail");

const gmailCommand = Command.make(
  "gmail",
  { senders, credentials, database, token, output, quiet, timeoutSeconds },
  ({ senders, credentials, database, token, output, quiet, timeoutSeconds }) =>
    handleGmailCommand(
      senders,
      credentials,
      database,
      token,
      output,
      quiet,
      timeoutSeconds,
    ),
).pipe(
  Command.withDescription(
    "Download inbox emails from the given senders into SQLite and print them as a table",
  ),
);

export default gmailCommand;
