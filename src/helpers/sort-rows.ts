import { Array, Option, Order } from "effect";

/**
 * Sorts data rows by their Last Contact date ascending. Rows with no date
 * come first, then rows whose date can't be read, then dated rows oldest
 * first. Ties (including between two undated rows) are broken
 * lexicographically by Company, ignoring case.
 *
 * @param dataRows - Rows of tab data to sort
 * @param headers - Column headers used to locate the Last Contact and
 * Company columns
 * @returns A new array of rows sorted by Last Contact date
 */
function sortRows(dataRows: string[][], headers: string[]): string[][] {
  const cellIn = (header: string) => {
    const index = Array.findFirstIndex(headers, (h) => h === header);
    return (row: string[]): string =>
      index.pipe(
        Option.flatMap((i) => Array.get(row, i)),
        Option.map((cell) => cell.trim()),
        Option.getOrElse(() => ""),
      );
  };
  const lastContactOf = cellIn("Last Contact");
  const companyOf = cellIn("Company");

  const byHasDate = Order.mapInput(
    Order.Boolean,
    (row: string[]) => lastContactOf(row) !== "",
  );
  const byDate = Order.mapInput(
    Order.Date,
    (row: string[]) => new Date(lastContactOf(row)),
  );
  const byCompany = Order.mapInput(Order.String, (row: string[]) =>
    companyOf(row).toLowerCase(),
  );

  return Array.sort(
    dataRows,
    Order.combine(Order.combine(byHasDate, byDate), byCompany),
  );
}

export default sortRows;
