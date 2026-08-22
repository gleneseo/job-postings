import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import SheetIndex from "../../src/helpers/sheet-index.js";

const isSheetIndex = Schema.is(SheetIndex);

describe("SheetIndex", () => {
  it("should accept zero", () => {
    expect(isSheetIndex(0)).toBe(true);
  });

  it("should accept a positive integer", () => {
    expect(isSheetIndex(3)).toBe(true);
  });

  it("should reject a negative number", () => {
    expect(isSheetIndex(-1)).toBe(false);
  });

  it("should reject a non-integer number", () => {
    expect(isSheetIndex(1.5)).toBe(false);
  });

  it("should reject a non-number value", () => {
    expect(isSheetIndex("0")).toBe(false);
  });
});
