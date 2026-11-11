import { Runtime } from "effect";
import { describe, expect, it } from "vitest";
import EmailFilesWriteError from "../../../src/gmail/email-files-write-error.js";

describe("EmailFilesWriteError", () => {
  it("should tag itself as EmailFilesWriteError", () => {
    expect(
      new EmailFilesWriteError({ directory: "out", cause: "bad" })._tag,
    ).toBe("EmailFilesWriteError");
  });

  it("should expose a distinct exit code and skip the default error log", () => {
    const error = new EmailFilesWriteError({ directory: "out", cause: "bad" });

    expect(Runtime.getErrorExitCode(error)).toBe(46);
    expect(error[Runtime.errorReported]).toBe(false);
  });

  it("should expose the directory and underlying cause", () => {
    const error = new EmailFilesWriteError({ directory: "out", cause: "bad" });

    expect(error.directory).toBe("out");
    expect(error.cause).toBe("bad");
  });
});
