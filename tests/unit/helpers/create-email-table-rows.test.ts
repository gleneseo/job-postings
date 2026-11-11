import { describe, expect, it } from "vitest";
import createEmailTableRows from "../../../src/helpers/create-email-table-rows.js";
import type Email from "../../../src/helpers/email.js";

const makeEmail = (receivedAt: string, subject: string): typeof Email.Type => ({
  id: subject,
  from: { name: "Ann", email: "ann@example.com" },
  to: { name: "Bob", email: "bob@example.com" },
  subject,
  textBody: "",
  htmlBody: "",
  receivedAt,
});

describe("createEmailTableRows", () => {
  it("should sort emails oldest first", () => {
    const rows = createEmailTableRows([
      makeEmail("2026-03-01T00:00:00.000Z", "newer"),
      makeEmail("2026-01-01T00:00:00.000Z", "older"),
    ]);

    expect(rows.map((row) => row.Subject)).toStrictEqual(["older", "newer"]);
  });

  it("should show the sender address and subject", () => {
    const [row] = createEmailTableRows([
      makeEmail("2026-01-01T00:00:00.000Z", "Hello"),
    ]);

    expect(row).toMatchObject({ From: "ann@example.com", Subject: "Hello" });
  });

  it("should show the receive date in local time as YYYY-MM-DD HH:MM", () => {
    const [row] = createEmailTableRows([
      makeEmail("2026-01-02T03:04:05.000Z", "Hello"),
    ]);
    const local = new Date("2026-01-02T03:04:05.000Z");
    const pad = (n: number) => n.toString().padStart(2, "0");

    expect(row?.Received).toBe(
      `${local.getFullYear().toString()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} ${pad(local.getHours())}:${pad(local.getMinutes())}`,
    );
  });
});
