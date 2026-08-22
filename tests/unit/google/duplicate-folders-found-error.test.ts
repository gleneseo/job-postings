import { describe, expect, it } from "vitest";
import { drive_v3 } from "googleapis";
import DuplicateFoldersFoundError from "../../../src/google/duplicate-folders-found-error.js";

describe("DuplicateFoldersFoundError", () => {
  it("should tag itself as DuplicateFoldersFoundError", () => {
    const error = DuplicateFoldersFoundError.fromArray([
      { id: "1", name: "first" },
      { id: "2", name: "second" },
    ]);

    expect(error._tag).toBe("DuplicateFoldersFoundError");
  });

  it("should expose the duplicate folders it was constructed with", () => {
    const error = DuplicateFoldersFoundError.fromArray([
      { id: "1", name: "first" },
      { id: "2", name: "second" },
    ]);

    expect(error.duplicates).toEqual([
      { id: "1", name: "first" },
      { id: "2", name: "second" },
    ]);
  });

  describe("fromArray", () => {
    it("should extract only the id and name of each duplicate", () => {
      const files: drive_v3.Schema$File[] = [
        {
          id: "1",
          name: "first",
          mimeType: "application/vnd.google-apps.folder",
        },
        {
          id: "2",
          name: "second",
          mimeType: "application/vnd.google-apps.folder",
        },
      ];

      const error = DuplicateFoldersFoundError.fromArray(files);

      expect(error.duplicates).toEqual([
        { id: "1", name: "first" },
        { id: "2", name: "second" },
      ]);
    });
  });
});
