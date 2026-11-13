import { describe, expect, it } from "vitest";
import { Runtime } from "effect";
import CredentialsFileNotFoundError from "../../../src/config/credentials-file-not-found-error.js";

describe("CredentialsFileNotFoundError", () => {
  it("should tag itself as CredentialsFileNotFoundError", () => {
    const error = new CredentialsFileNotFoundError({
      path: "/k.json",
      source: "flag",
    });

    expect(error._tag).toBe("CredentialsFileNotFoundError");
  });

  it("should expose the path and source", () => {
    const error = new CredentialsFileNotFoundError({
      path: "/k.json",
      source: "well-known location",
    });

    expect(error.path).toBe("/k.json");
    expect(error.source).toBe("well-known location");
  });

  it("should format a message including the path and source", () => {
    const error = new CredentialsFileNotFoundError({
      path: "/k.json",
      source: "flag",
    });

    expect(error.message).toBe(
      "OAuth2 credentials file [/k.json] from the flag not found",
    );
  });

  it("should exit with code 41 without a default error log", () => {
    const error = new CredentialsFileNotFoundError({
      path: "/k.json",
      source: "flag",
    });

    expect(error[Runtime.errorExitCode]).toBe(41);
    expect(error[Runtime.errorReported]).toBe(false);
  });
});
