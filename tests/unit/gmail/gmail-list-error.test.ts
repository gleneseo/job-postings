import { Runtime } from "effect";
import { describe, expect, it } from "vitest";
import GmailListError from "../../../src/gmail/gmail-list-error.js";

describe("GmailListError", () => {
  it("should tag itself as GmailListError", () => {
    expect(new GmailListError({ cause: "bad" })._tag).toBe("GmailListError");
  });

  it("should expose a distinct exit code and skip the default error log", () => {
    const error = new GmailListError({ cause: "bad" });

    expect(Runtime.getErrorExitCode(error)).toBe(43);
    expect(error[Runtime.errorReported]).toBe(false);
  });

  it("should expose the underlying cause", () => {
    expect(new GmailListError({ cause: "bad" }).cause).toBe("bad");
  });
});
