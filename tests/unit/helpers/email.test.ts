import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import Email from "../../../src/helpers/email.js";

const isEmail = Schema.is(Email);

const email = {
  id: "1",
  from: { name: "Ann", email: "ann@example.com" },
  to: { name: "Bob", email: "bob@example.com" },
  subject: "Hello",
  textBody: "Body",
  htmlBody: "",
  receivedAt: "2026-01-02T03:04:05.000Z",
};

describe("Email", () => {
  it("should accept an email with every field", () => {
    expect(isEmail(email)).toBe(true);
  });

  it("should reject an email missing a field", () => {
    expect(isEmail({ ...email, subject: undefined })).toBe(false);
  });

  it("should reject a person without an address", () => {
    expect(isEmail({ ...email, from: { name: "Ann" } })).toBe(false);
  });
});
