import { homedir } from "node:os";
import { join } from "node:path";

const configDirectory = join(homedir(), ".config", "gmail-downloader");

/**
 * Where the `gmail` command looks for, and keeps, its files when no path is
 * given, shared with the `gmail-downloader` application
 */
const defaultGmailPaths = {
  credentials: join(configDirectory, "access.json"),
  token: join(configDirectory, "token.json"),
  db: join(configDirectory, "emails.sqlite"),
};

export default defaultGmailPaths;
