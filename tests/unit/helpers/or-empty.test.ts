import { describe, expect, it } from "vitest";
import orEmpty from "../../../src/helpers/or-empty.js";

describe("orEmpty", () => {
  it("should return the string when it is present", () => {
    expect(orEmpty("Engines")).toBe("Engines");
  });

  it("should return an empty string for null", () => {
    expect(orEmpty(null)).toBe("");
  });

  it("should return an empty string for undefined", () => {
    expect(orEmpty(undefined)).toBe("");
  });
});
