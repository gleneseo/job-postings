import { Runtime } from "effect";
import { describe, expect, it } from "vitest";
import GmailFetchError from "../../../src/gmail/gmail-fetch-error.js";

describe("GmailFetchError", () => {
  it("should tag itself as GmailFetchError", () => {
    expect(new GmailFetchError({ messageId: "m1", cause: "bad" })._tag).toBe(
      "GmailFetchError",
    );
  });

  it("should expose a distinct exit code and skip the default error log", () => {
    const error = new GmailFetchError({ messageId: "m1", cause: "bad" });

    expect(Runtime.getErrorExitCode(error)).toBe(44);
    expect(error[Runtime.errorReported]).toBe(false);
  });

  it("should expose the message ID and underlying cause", () => {
    const error = new GmailFetchError({ messageId: "m1", cause: "bad" });

    expect(error.messageId).toBe("m1");
    expect(error.cause).toBe("bad");
  });
});
