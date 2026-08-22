import { describe, expect, it } from "vitest";
import FileWriteError from "../../../src/file-system/file-write-error.js";

describe("FileWriteError", () => {
  it("should tag itself as FileWriteError", () => {
    const error = new FileWriteError({ cause: new Error("disk full") });

    expect(error._tag).toBe("FileWriteError");
  });

  it("should expose the underlying cause", () => {
    const cause = new Error("disk full");
    const error = new FileWriteError({ cause });

    expect(error.cause).toBe(cause);
  });
});
