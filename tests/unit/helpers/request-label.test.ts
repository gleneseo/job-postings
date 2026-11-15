import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import RequestLabel from "../../../src/helpers/request-label.js";

const isRequestLabel = Schema.is(RequestLabel);

describe("RequestLabel", () => {
  it("should accept a non-empty string", () => {
    expect(isRequestLabel("Folder search")).toBe(true);
  });

  it("should reject an empty string", () => {
    expect(isRequestLabel("")).toBe(false);
  });

  it("should reject a non-string value", () => {
    expect(isRequestLabel(42)).toBe(false);
  });
});
