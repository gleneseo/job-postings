import { Schema } from "effect";

/**
 * The zero-based index of a sheet within a Google Sheets spreadsheet
 */
const SheetIndex = Schema.Natural.pipe(Schema.brand("SheetIndex"));

export default SheetIndex;
