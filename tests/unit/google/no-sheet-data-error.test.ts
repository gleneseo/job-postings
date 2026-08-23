import { describe, expect, it } from "vitest";
import NoSheetDataError from "../../../src/google/no-sheet-data-error.js";

describe("NoSheetDataError", () => {
  it("should tag itself as NoSheetDataError", () => {
    const error = new NoSheetDataError({ sheetIndex: 0 });

    expect(error._tag).toBe("NoSheetDataError");
  });

  it("should expose the sheet index that has no rows", () => {
    const error = new NoSheetDataError({ sheetIndex: 3 });

    expect(error.sheetIndex).toBe(3);
  });

  it("should format a message including the sheet index", () => {
    const error = new NoSheetDataError({ sheetIndex: 3 });

    expect(error.message).toBe("The sheet at index [3] does not have any rows");
  });
});
