import { describe, expect, it } from "vitest";
import FileSearchError from "../../../src/google/file-search-error.js";

describe("FileSearchError", () => {
  it("should tag itself as FileSearchError", () => {
    const error = new FileSearchError({ cause: new Error("network down") });

    expect(error._tag).toBe("FileSearchError");
  });

  it("should expose the underlying cause", () => {
    const cause = new Error("network down");
    const error = new FileSearchError({ cause });

    expect(error.cause).toBe(cause);
  });
});
