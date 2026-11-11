import { Runtime } from "effect";
import { describe, expect, it } from "vitest";
import CredentialsNotFoundError from "../../../src/gmail/credentials-not-found-error.js";

describe("CredentialsNotFoundError", () => {
  it("should tag itself as CredentialsNotFoundError", () => {
    expect(
      new CredentialsNotFoundError({ path: "/a.json", isDefault: true })._tag,
    ).toBe("CredentialsNotFoundError");
  });

  it("should expose a distinct exit code and skip the default error log", () => {
    const error = new CredentialsNotFoundError({
      path: "/a.json",
      isDefault: true,
    });

    expect(Runtime.getErrorExitCode(error)).toBe(40);
    expect(error[Runtime.errorReported]).toBe(false);
  });

  it("should expose the path and whether it is the default", () => {
    const error = new CredentialsNotFoundError({
      path: "/a.json",
      isDefault: false,
    });

    expect(error.path).toBe("/a.json");
    expect(error.isDefault).toBe(false);
  });

  it("should format a message including the path", () => {
    const error = new CredentialsNotFoundError({
      path: "/a.json",
      isDefault: true,
    });

    expect(error.message).toBe("Credentials file [/a.json] not found");
  });
});
