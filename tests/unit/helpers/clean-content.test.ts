import { describe, expect, it } from "vitest";
import cleanContent from "../../../src/helpers/clean-content.js";

describe("cleanContent", () => {
  it("should keep tabs, newlines, and carriage returns", () => {
    expect(cleanContent("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });

  it("should remove control characters", () => {
    expect(cleanContent("a\u0000b\u0008c\u001fd\u007fe\u009ff")).toBe("abcdef");
  });

  it("should remove replacement characters, byte order marks, and noncharacters", () => {
    expect(cleanContent("a\ufffdb\ufeffc\ufffed\uffffe")).toBe("abcde");
  });

  it("should remove lone surrogates", () => {
    expect(cleanContent("a\ud800b\udc00c")).toBe("abc");
  });

  it("should keep valid surrogate pairs", () => {
    expect(cleanContent("a\ud83d\ude00b")).toBe("a\ud83d\ude00b");
  });
});
