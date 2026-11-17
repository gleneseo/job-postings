import { Runtime } from "effect";
import { describe, expect, it } from "vitest";
import KeyFileReadError from "../../../src/google/key-file-read-error.js";
import FilePath from "../../../src/helpers/file-path.js";

const path = FilePath.make("/a.json");

describe("KeyFileReadError", () => {
  it("should tag itself as KeyFileReadError", () => {
    expect(new KeyFileReadError({ path, cause: "bad" })._tag).toBe(
      "KeyFileReadError",
    );
  });

  it("should expose a distinct exit code and skip the default error log", () => {
    const error = new KeyFileReadError({ path, cause: "bad" });

    expect(Runtime.getErrorExitCode(error)).toBe(43);
    expect(error[Runtime.errorReported]).toBe(false);
  });

  it("should expose the path and underlying cause", () => {
    const error = new KeyFileReadError({ path, cause: "bad" });

    expect(error.path).toBe(path);
    expect(error.cause).toBe("bad");
  });
});
