import { describe, expect, it } from "vitest";
import cleanContent from "../../../src/helpers/clean-content.js";

describe("cleanContent", () => {
  it("should keep tabs, newlines, and carriage returns", () => {
    expect(cleanContent("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });

  it("should remove control characters", () => {
    expect(cleanContent("a\u0000b\u0008c\u001fd\u007fe\u009ff")).toBe("abcdef");
  });

  it("should remove terminal escape sequences' escape character", () => {
    expect(cleanContent("a\u001b[31mb")).toBe("a[31mb");
  });

  it("should keep replacement characters, byte order marks, and noncharacters", () => {
    expect(cleanContent("a\ufffdb\ufeffc\uffffd")).toBe(
      "a\ufffdb\ufeffc\uffffd",
    );
  });

  it("should keep non-ASCII text", () => {
    expect(cleanContent("Café — 日本 😀")).toBe("Café — 日本 😀");
  });
});
