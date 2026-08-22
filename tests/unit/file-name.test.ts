import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import FileName from "../../src/helpers/file-name.js";

const isFileName = Schema.is(FileName);

describe("FileName", () => {
  it("should accept a non-empty string", () => {
    expect(isFileName("my-file.txt")).toBe(true);
  });

  it("should reject an empty string", () => {
    expect(isFileName("")).toBe(false);
  });

  it("should reject a non-string value", () => {
    expect(isFileName(42)).toBe(false);
  });
});
