import { describe, expect, it } from "vitest";
import InvalidSheetIndexError from "../../../src/google/invalid-sheet-index-error.js";

describe("InvalidSheetIndexError", () => {
  it("should tag itself as InvalidSheetIndexError", () => {
    const error = new InvalidSheetIndexError({
      indexRequested: 2,
      totalCount: 1,
    });

    expect(error._tag).toBe("InvalidSheetIndexError");
  });

  it("should expose the sheet index that was requested", () => {
    const error = new InvalidSheetIndexError({
      indexRequested: 2,
      totalCount: 1,
    });

    expect(error.indexRequested).toBe(2);
  });

  it("should expose the total number of available sheets", () => {
    const error = new InvalidSheetIndexError({
      indexRequested: 2,
      totalCount: 1,
    });

    expect(error.totalCount).toBe(1);
  });

  it("should format a message including the requested index and total count", () => {
    const error = new InvalidSheetIndexError({
      indexRequested: 2,
      totalCount: 1,
    });

    expect(error.message).toBe(
      "Sheet index [2] is invalid; only [1] sheet(s) available",
    );
  });
});
