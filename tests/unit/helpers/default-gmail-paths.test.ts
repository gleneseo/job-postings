import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import defaultGmailPaths from "../../../src/helpers/default-gmail-paths.js";

describe("defaultGmailPaths", () => {
  it("should keep every file under the gmail-downloader config directory", () => {
    const directory = join(homedir(), ".config", "gmail-downloader");

    expect(defaultGmailPaths).toStrictEqual({
      credentials: join(directory, "access.json"),
      token: join(directory, "token.json"),
      db: join(directory, "emails.sqlite"),
    });
  });
});
