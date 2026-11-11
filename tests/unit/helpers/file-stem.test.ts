import { describe, expect, it } from "vitest";
import fileStem from "../../../src/helpers/file-stem.js";

describe("fileStem", () => {
  it("should keep an ordinary subject", () => {
    expect(fileStem("Your application")).toBe("Your application");
  });

  it("should replace characters that are invalid in file names", () => {
    expect(fileStem('a/b\\c:d*e?f"g<h>i|j\u0001k')).toBe(
      "a_b_c_d_e_f_g_h_i_jk",
    );
  });

  it("should trim surrounding whitespace", () => {
    expect(fileStem("  hello  ")).toBe("hello");
  });

  it("should truncate long subjects to 150 characters", () => {
    expect(fileStem("a".repeat(200))).toBe("a".repeat(150));
  });

  it("should trim whitespace exposed by truncating", () => {
    expect(fileStem(`${"a".repeat(149)}  b`)).toBe("a".repeat(149));
  });

  it("should fall back to a placeholder for an empty subject", () => {
    expect(fileStem("")).toBe("(no subject)");
  });

  it("should fall back to a placeholder for a subject of only dots", () => {
    expect(fileStem("...")).toBe("(no subject)");
  });
});
