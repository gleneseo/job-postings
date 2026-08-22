import { describe, expect, it } from "vitest";
import { drive_v3 } from "googleapis";
import DuplicateFilesFoundError from "../../../src/google/duplicate-files-found-error.js";

describe("DuplicateFilesFoundError", () => {
  it("should tag itself as DuplicateFilesFoundError", () => {
    const error = DuplicateFilesFoundError.fromArray([
      { id: "1", name: "first" },
      { id: "2", name: "second" },
    ]);

    expect(error._tag).toBe("DuplicateFilesFoundError");
  });

  it("should expose the duplicate files it was constructed with", () => {
    const error = DuplicateFilesFoundError.fromArray([
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
          mimeType: "application/vnd.google-apps.spreadsheet",
        },
        {
          id: "2",
          name: "second",
          mimeType: "application/vnd.google-apps.spreadsheet",
        },
      ];

      const error = DuplicateFilesFoundError.fromArray(files);

      expect(error.duplicates).toEqual([
        { id: "1", name: "first" },
        { id: "2", name: "second" },
      ]);
    });
  });
});
