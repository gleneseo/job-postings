import { describe, expect, it } from "vitest";
import SheetValuesFetchError from "../../../src/google/sheet-values-fetch-error.js";

describe("SheetValuesFetchError", () => {
  it("should tag itself as SheetValuesFetchError", () => {
    const error = new SheetValuesFetchError({
      sheetIndex: 0,
      cause: new Error("network down"),
    });

    expect(error._tag).toBe("SheetValuesFetchError");
  });

  it("should expose the underlying cause", () => {
    const cause = new Error("network down");
    const error = new SheetValuesFetchError({ sheetIndex: 0, cause });

    expect(error.cause).toBe(cause);
  });

  it("should expose the sheet index whose values failed to fetch", () => {
    const error = new SheetValuesFetchError({
      sheetIndex: 3,
      cause: new Error("network down"),
    });

    expect(error.sheetIndex).toBe(3);
  });

  it("should format a message including the sheet index", () => {
    const error = new SheetValuesFetchError({
      sheetIndex: 3,
      cause: new Error("network down"),
    });

    expect(error.message).toBe("Failed to fetch values for sheet [3]");
  });
});
