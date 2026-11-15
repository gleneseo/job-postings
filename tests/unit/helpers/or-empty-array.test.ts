import { describe, expect, it } from "vitest";
import orEmptyArray from "../../../src/helpers/or-empty-array.js";

describe("orEmptyArray", () => {
  it("should return the array when it is present", () => {
    expect(orEmptyArray(["a", "b"])).toEqual(["a", "b"]);
  });

  it("should return an empty array for null", () => {
    expect(orEmptyArray(null)).toEqual([]);
  });

  it("should return an empty array for undefined", () => {
    expect(orEmptyArray(undefined)).toEqual([]);
  });
});
