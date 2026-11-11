import { Runtime } from "effect";
import { describe, expect, it } from "vitest";
import GmailAuthError from "../../../src/gmail/gmail-auth-error.js";

describe("GmailAuthError", () => {
  it("should tag itself as GmailAuthError", () => {
    expect(new GmailAuthError({ cause: "bad" })._tag).toBe("GmailAuthError");
  });

  it("should expose a distinct exit code and skip the default error log", () => {
    const error = new GmailAuthError({ cause: "bad" });

    expect(Runtime.getErrorExitCode(error)).toBe(42);
    expect(error[Runtime.errorReported]).toBe(false);
  });

  it("should expose the underlying cause", () => {
    expect(new GmailAuthError({ cause: "bad" }).cause).toBe("bad");
  });
});
