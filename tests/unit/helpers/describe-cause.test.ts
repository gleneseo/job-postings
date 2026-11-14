import { describe, expect, it } from "vitest";
import describeCause from "../../../src/helpers/describe-cause.js";

describe("describeCause", () => {
  it("should describe an Error by its message", () => {
    expect(describeCause(new Error("network down"))).toBe("network down");
  });

  it("should describe any other value as a string", () => {
    expect(describeCause("just text")).toBe("just text");
  });
});
