import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import FolderId from "../../src/helpers/folder-id.js";

const isFolderId = Schema.is(FolderId);

describe("FolderId", () => {
  it("should accept a non-empty string", () => {
    expect(isFolderId("1A2b3C4d5E")).toBe(true);
  });

  it("should reject an empty string", () => {
    expect(isFolderId("")).toBe(false);
  });

  it("should reject a non-string value", () => {
    expect(isFolderId(42)).toBe(false);
  });
});
