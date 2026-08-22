import { describe, expect, it } from "vitest";
import FolderSearchError from "../../../src/google/folder-search-error.js";

describe("FolderSearchError", () => {
  it("should tag itself as FolderSearchError", () => {
    const error = new FolderSearchError({ cause: new Error("network down") });

    expect(error._tag).toBe("FolderSearchError");
  });

  it("should expose the underlying cause", () => {
    const cause = new Error("network down");
    const error = new FolderSearchError({ cause });

    expect(error.cause).toBe(cause);
  });
});
