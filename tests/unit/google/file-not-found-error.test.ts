import { describe, expect, it } from "vitest";
import FileNotFoundError from "../../../src/google/file-not-found-error.js";

describe("FileNotFoundError", () => {
  it("should tag itself as FileNotFoundError", () => {
    const error = new FileNotFoundError({ fileName: "my-file" });

    expect(error._tag).toBe("FileNotFoundError");
  });

  it("should expose the file name that was searched for", () => {
    const error = new FileNotFoundError({ fileName: "my-file" });

    expect(error.fileName).toBe("my-file");
  });

  it("should format a message including the file name", () => {
    const error = new FileNotFoundError({ fileName: "my-file" });

    expect(error.message).toBe("File [my-file] not found");
  });
});
