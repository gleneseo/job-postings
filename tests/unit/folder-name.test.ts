import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import FolderName from "../../src/helpers/folder-name.js";

const isFolderName = Schema.is(FolderName);

describe("FolderName", () => {
  it("should accept a non-empty string", () => {
    expect(isFolderName("my-folder")).toBe(true);
  });

  it("should reject an empty string", () => {
    expect(isFolderName("")).toBe(false);
  });

  it("should reject a non-string value", () => {
    expect(isFolderName(42)).toBe(false);
  });
});
