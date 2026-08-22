import { Effect } from "effect";
import sortRows from "./sort-rows.js";

/**
 * Splits the header row from the data rows, sorts the data rows via
 * {@link sortRows}, and reassembles them with the header row preserved
 *
 * @param values - Rows of sheet values, with the first row treated as the
 * header
 * @returns An effect that resolves with the sorted rows
 */
const sortValues = (values: string[][]) =>
  Effect.sync(() => {
    const [headerRow, ...dataRows] = values;
    const sortedDataRows = sortRows(dataRows, headerRow ?? []);
    return headerRow?.length ? [headerRow, ...sortedDataRows] : sortedDataRows;
  }).pipe(Effect.withSpan("sort-values"));

export default sortValues;
