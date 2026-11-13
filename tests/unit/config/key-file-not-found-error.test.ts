import { describe, expect, it } from "vitest";
import { Runtime } from "effect";
import KeyFileNotFoundError from "../../../src/config/key-file-not-found-error.js";

describe("KeyFileNotFoundError", () => {
  it("should tag itself as KeyFileNotFoundError", () => {
    const error = new KeyFileNotFoundError({ path: "/k.json", source: "flag" });

    expect(error._tag).toBe("KeyFileNotFoundError");
  });

  it("should expose the path and source", () => {
    const error = new KeyFileNotFoundError({
      path: "/k.json",
      source: "well-known location",
    });

    expect(error.path).toBe("/k.json");
    expect(error.source).toBe("well-known location");
  });

  it("should format a message including the path and source", () => {
    const error = new KeyFileNotFoundError({ path: "/k.json", source: "flag" });

    expect(error.message).toBe("Key file [/k.json] from the flag not found");
  });

  it("should exit with code 40 without a default error log", () => {
    const error = new KeyFileNotFoundError({ path: "/k.json", source: "flag" });

    expect(error[Runtime.errorExitCode]).toBe(40);
    expect(error[Runtime.errorReported]).toBe(false);
  });
});
