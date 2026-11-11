import { describe, expect, it } from "vitest";
import type Email from "../../../src/helpers/email.js";
import planEmailFiles from "../../../src/helpers/plan-email-files.js";

const makeEmail = (
  overrides: Partial<typeof Email.Type>,
): typeof Email.Type => ({
  id: "1",
  from: { name: "Ann", email: "ann@example.com" },
  to: { name: "Bob", email: "bob@example.com" },
  subject: "Hello",
  textBody: "Body",
  htmlBody: "",
  receivedAt: "2026-01-02T03:04:05.000Z",
  ...overrides,
});

describe("planEmailFiles", () => {
  it("should plan a text file with headers and the plain-text body", () => {
    expect(planEmailFiles([makeEmail({})])).toStrictEqual([
      {
        name: "Hello.txt",
        content:
          "From: Ann <ann@example.com>\nTo: Bob <bob@example.com>\nSubject: Hello\nReceived: 2026-01-02T03:04:05.000Z\n\nBody",
      },
    ]);
  });

  it("should plan an html file for an email with only an HTML body", () => {
    expect(
      planEmailFiles([makeEmail({ textBody: "  ", htmlBody: "<p>Hi</p>" })]),
    ).toStrictEqual([
      {
        name: "Hello.html",
        content: "<!-- Received: 2026-01-02T03:04:05.000Z -->\n<p>Hi</p>",
      },
    ]);
  });

  it("should plan a text file for an email with both bodies", () => {
    const [file] = planEmailFiles([makeEmail({ htmlBody: "<p>Hi</p>" })]);

    expect(file?.name).toBe("Hello.txt");
  });

  it("should plan a text file for an email with no body", () => {
    const [file] = planEmailFiles([makeEmail({ textBody: "" })]);

    expect(file?.name).toBe("Hello.txt");
  });

  it("should append the message ID to the later of two emails sharing a subject", () => {
    const files = planEmailFiles([
      makeEmail({ id: "b" }),
      makeEmail({ id: "a" }),
    ]);

    expect(files.map((file) => file.name)).toStrictEqual([
      "Hello.txt",
      "Hello (b).txt",
    ]);
  });

  it("should keep header values on a single line", () => {
    const [file] = planEmailFiles([
      makeEmail({
        subject: "Hi\nBcc: x",
        from: { name: "A\nB", email: "a@b" },
      }),
    ]);

    expect(file?.content).toContain("From: A B <a@b>\n");
    expect(file?.content).toContain("Subject: Hi Bcc: x\n");
  });

  it("should not modify the emails it is given", () => {
    const emails = [makeEmail({ id: "b" }), makeEmail({ id: "a" })];

    planEmailFiles(emails);

    expect(emails.map((email) => email.id)).toStrictEqual(["b", "a"]);
  });
});
