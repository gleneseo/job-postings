import { Schema } from "effect";

/**
 * The zero-based index of a tab within a Google Sheets spreadsheet
 */
const TabIndex = Schema.Natural.pipe(Schema.brand("TabIndex"));

export default TabIndex;
