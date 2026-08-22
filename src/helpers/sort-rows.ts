/**
 * Sorts data rows by their Last Contact date ascending, placing rows with no
 * date first and breaking ties (including between two undated rows)
 * alphabetically by Company
 *
 * @param dataRows - Rows of sheet data to sort
 * @param headers - Column headers used to locate the Last Contact and
 * Company columns
 * @returns A new array of rows sorted by Last Contact date
 */
function sortRows(dataRows: string[][], headers: string[]): string[][] {
  const lastContactIdx = headers.indexOf("Last Contact");
  const companyIdx = headers.indexOf("Company");

  const companyOf = (row: string[]): string =>
    companyIdx >= 0 ? (row[companyIdx] ?? "").trim() : "";

  return [...dataRows].sort((a, b) => {
    const aContact =
      lastContactIdx >= 0 ? (a[lastContactIdx] ?? "").trim() : "";
    const bContact =
      lastContactIdx >= 0 ? (b[lastContactIdx] ?? "").trim() : "";
    const aHasDate = aContact !== "";
    const bHasDate = bContact !== "";

    if (!aHasDate && !bHasDate) {
      return companyOf(a).localeCompare(companyOf(b));
    }
    if (!aHasDate) {
      return -1;
    }
    if (!bHasDate) {
      return 1;
    }

    const dateDiff =
      new Date(aContact).getTime() - new Date(bContact).getTime();
    return dateDiff !== 0 ? dateDiff : companyOf(a).localeCompare(companyOf(b));
  });
}

export default sortRows;
