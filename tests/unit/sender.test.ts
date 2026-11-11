import { describe, expect, it } from "vitest";
import { Schema } from "effect";

import Sender from "../../src/helpers/sender.js";

const isSender = Schema.is(Sender);

describe("Sender", () => {
  it("should accept an email address", () => {
    expect(isSender("jobs@example.com")).toBe(true);
  });

  it("should accept a domain", () => {
    expect(isSender("example.com")).toBe(true);
  });

  it("should reject an empty string", () => {
    expect(isSender("")).toBe(false);
  });

  it("should reject a non-string value", () => {
    expect(isSender(42)).toBe(false);
  });
});
