import { describe, expect, it } from "vitest";
import FolderNotFoundError from "../../../src/google/folder-not-found-error.js";

describe("FolderNotFoundError", () => {
  it("should tag itself as FolderNotFoundError", () => {
    const error = new FolderNotFoundError({ folderName: "my-folder" });

    expect(error._tag).toBe("FolderNotFoundError");
  });

  it("should expose the folder name that was searched for", () => {
    const error = new FolderNotFoundError({ folderName: "my-folder" });

    expect(error.folderName).toBe("my-folder");
  });

  it("should format a message including the folder name", () => {
    const error = new FolderNotFoundError({ folderName: "my-folder" });

    expect(error.message).toBe("Folder [my-folder] not found");
  });
});
