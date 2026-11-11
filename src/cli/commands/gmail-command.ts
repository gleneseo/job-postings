import { Command, Flag } from "effect/cli";
import handleGmailCommand from "../command-handlers/handle-gmail-command.js";
import defaultGmailPaths from "../../helpers/default-gmail-paths.js";
import FilePath from "../../helpers/file-path.js";
import Sender from "../../helpers/sender.js";

const senders = Flag.String("sender").pipe(
  Flag.withSchema(Sender),
  Flag.withAlias("s"),
  Flag.atLeast(0),
  Flag.withDescription(
    "An email address or domain to download emails from (e.g. ziprecruiter.com); repeat for several senders; omit to download every inbox email",
  ),
);

const credentials = Flag.String("credentials").pipe(
  Flag.withSchema(FilePath),
  Flag.withAlias("c"),
  Flag.optional,
  Flag.withDescription(
    `The path to the Google OAuth client JSON file (default: ${defaultGmailPaths.credentials})`,
  ),
);

const db = Flag.String("db").pipe(
  Flag.withSchema(FilePath),
  Flag.withAlias("d"),
  Flag.withDefault(FilePath.make(defaultGmailPaths.db)),
  Flag.withDescription(
    `The SQLite file to write emails to (default: ${defaultGmailPaths.db})`,
  ),
);

const token = Flag.String("token").pipe(
  Flag.withSchema(FilePath),
  Flag.withAlias("t"),
  Flag.withDefault(FilePath.make(defaultGmailPaths.token)),
  Flag.withDescription(
    `Where to cache the OAuth token (default: ${defaultGmailPaths.token})`,
  ),
);

const saveFiles = Flag.String("save-files").pipe(
  Flag.withSchema(FilePath),
  Flag.withOptionalValue("output"),
  Flag.optional,
  Flag.withDescription(
    "Also save each email as <subject>.txt (.html if it has only an HTML body) in a directory, including emails already in the database; give it as --save-files=<dir> (default: output)",
  ),
);

const gmailCommand = Command.make(
  "gmail",
  { senders, credentials, db, token, saveFiles },
  ({ senders, credentials, db, token, saveFiles }) =>
    handleGmailCommand(senders, credentials, db, token, saveFiles),
).pipe(
  Command.withDescription(
    "Download inbox emails from the given senders into SQLite and print them as a table",
  ),
);

export default gmailCommand;
