import { describe, expect, it } from "vitest";
import MissingFileIdError from "../../../src/google/missing-file-id-error.js";

describe("MissingFileIdError", () => {
  it("should tag itself as MissingFileIdError", () => {
    const error = new MissingFileIdError({ fileName: "my-file" });

    expect(error._tag).toBe("MissingFileIdError");
  });

  it("should expose the file name whose matched file was missing an ID", () => {
    const error = new MissingFileIdError({ fileName: "my-file" });

    expect(error.fileName).toBe("my-file");
  });

  it("should format a message including the file name", () => {
    const error = new MissingFileIdError({ fileName: "my-file" });

    expect(error.message).toBe("File [my-file] is missing an ID");
  });
});
