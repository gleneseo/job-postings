import type Email from "./email.js";

/**
 * Sorts emails by receive date (oldest first) and maps each to a row for
 * `console.table`, with the receive date in local time as `YYYY-MM-DD HH:MM`
 *
 * @param emails - The emails to tabulate
 * @returns The table rows
 */
const createEmailTableRows = (emails: readonly (typeof Email.Type)[]) =>
  [...emails]
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    .map((email) => ({
      Received: new Date(email.receivedAt).toLocaleString("sv-SE").slice(0, 16),
      From: email.from.email,
      Subject: email.subject,
    }));

export default createEmailTableRows;
