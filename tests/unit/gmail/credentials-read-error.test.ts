import { Runtime } from "effect";
import { describe, expect, it } from "vitest";
import CredentialsReadError from "../../../src/gmail/credentials-read-error.js";

describe("CredentialsReadError", () => {
  it("should tag itself as CredentialsReadError", () => {
    expect(
      new CredentialsReadError({ path: "/a.json", cause: "bad" })._tag,
    ).toBe("CredentialsReadError");
  });

  it("should expose a distinct exit code and skip the default error log", () => {
    const error = new CredentialsReadError({ path: "/a.json", cause: "bad" });

    expect(Runtime.getErrorExitCode(error)).toBe(41);
    expect(error[Runtime.errorReported]).toBe(false);
  });

  it("should expose the path and underlying cause", () => {
    const error = new CredentialsReadError({ path: "/a.json", cause: "bad" });

    expect(error.path).toBe("/a.json");
    expect(error.cause).toBe("bad");
  });
});
