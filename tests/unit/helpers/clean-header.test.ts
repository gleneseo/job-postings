import { describe, expect, it } from "vitest";
import cleanHeader from "../../../src/helpers/clean-header.js";

describe("cleanHeader", () => {
  it("should collapse line breaks into a single space", () => {
    expect(cleanHeader("a\r\nBcc: x\ny\u2028z\u2029w")).toBe("a Bcc: x y z w");
  });

  it("should remove characters that don't belong in a file", () => {
    expect(cleanHeader("a\u0000b\ufffdc")).toBe("abc");
  });
});
