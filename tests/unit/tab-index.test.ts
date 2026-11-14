import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import TabIndex from "../../src/helpers/tab-index.js";

const isTabIndex = Schema.is(TabIndex);

describe("TabIndex", () => {
  it("should accept zero", () => {
    expect(isTabIndex(0)).toBe(true);
  });

  it("should accept a positive integer", () => {
    expect(isTabIndex(3)).toBe(true);
  });

  it("should reject a negative number", () => {
    expect(isTabIndex(-1)).toBe(false);
  });

  it("should reject a non-integer number", () => {
    expect(isTabIndex(1.5)).toBe(false);
  });

  it("should reject a non-number value", () => {
    expect(isTabIndex("0")).toBe(false);
  });
});
