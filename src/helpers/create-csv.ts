import { Effect } from "effect";

/**
 * Serializes rows of cells into CSV text, quoting and escaping cells that
 * contain a comma, newline, or double quote. Null and undefined cells are
 * treated as empty strings.
 *
 * @param rows - Rows of cells to serialize
 * @returns An effect that resolves with the CSV text
 */
const createCsv = (rows: (string | null | undefined)[][]) =>
  Effect.sync(() =>
    rows
      .map((row) =>
        row
          .map((cell) => {
            const value = cell ?? "";
            return value.includes(",") ||
              value.includes("\n") ||
              value.includes('"')
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(","),
      )
      .join("\n"),
  ).pipe(Effect.withSpan("create-csv"));

export default createCsv;
