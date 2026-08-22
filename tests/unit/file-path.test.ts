import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import FilePath from "../../src/helpers/file-path.js";

const isFilePath = Schema.is(FilePath);

describe("FilePath", () => {
  it("should accept a non-empty string", () => {
    expect(isFilePath("/tmp/file.txt")).toBe(true);
  });

  it("should reject an empty string", () => {
    expect(isFilePath("")).toBe(false);
  });

  it("should reject a non-string value", () => {
    expect(isFilePath(42)).toBe(false);
  });
});
