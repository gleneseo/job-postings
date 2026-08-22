import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import FileId from "../../src/helpers/file-id.js";

const isFileId = Schema.is(FileId);

describe("FileId", () => {
  it("should accept a non-empty string", () => {
    expect(isFileId("1A2b3C4d5E")).toBe(true);
  });

  it("should reject an empty string", () => {
    expect(isFileId("")).toBe(false);
  });

  it("should reject a non-string value", () => {
    expect(isFileId(42)).toBe(false);
  });
});
