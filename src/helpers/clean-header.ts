import cleanContent from "./clean-content.js";

/**
 * Cleans a single header value like {@link cleanContent}, and also collapses
 * line breaks so the value can't inject extra headers
 *
 * @param text - The header value to clean
 * @returns The header value on a single line
 */
const cleanHeader = (text: string) =>
  cleanContent(text).replace(/[\r\n\u2028\u2029]+/g, " ");

export default cleanHeader;
