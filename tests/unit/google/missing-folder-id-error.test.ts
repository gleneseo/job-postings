import { describe, expect, it } from "vitest";
import MissingFolderIdError from "../../../src/google/missing-folder-id-error.js";

describe("MissingFolderIdError", () => {
  it("should tag itself as MissingFolderIdError", () => {
    const error = new MissingFolderIdError({ folderName: "my-folder" });

    expect(error._tag).toBe("MissingFolderIdError");
  });

  it("should expose the folder name whose matched folder was missing an ID", () => {
    const error = new MissingFolderIdError({ folderName: "my-folder" });

    expect(error.folderName).toBe("my-folder");
  });

  it("should format a message including the folder name", () => {
    const error = new MissingFolderIdError({ folderName: "my-folder" });

    expect(error.message).toBe("Folder [my-folder] is missing an ID");
  });
});
