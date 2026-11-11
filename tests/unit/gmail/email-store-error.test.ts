import { Runtime } from "effect";
import { describe, expect, it } from "vitest";
import EmailStoreError from "../../../src/gmail/email-store-error.js";

describe("EmailStoreError", () => {
  it("should tag itself as EmailStoreError", () => {
    expect(new EmailStoreError({ path: "/a.sqlite", cause: "bad" })._tag).toBe(
      "EmailStoreError",
    );
  });

  it("should expose a distinct exit code and skip the default error log", () => {
    const error = new EmailStoreError({ path: "/a.sqlite", cause: "bad" });

    expect(Runtime.getErrorExitCode(error)).toBe(45);
    expect(error[Runtime.errorReported]).toBe(false);
  });

  it("should expose the path and underlying cause", () => {
    const error = new EmailStoreError({ path: "/a.sqlite", cause: "bad" });

    expect(error.path).toBe("/a.sqlite");
    expect(error.cause).toBe("bad");
  });
});
