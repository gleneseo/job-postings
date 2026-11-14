/**
 * Removes the control characters that don't belong in a text or HTML file,
 * keeping tab, newline, and carriage return. These include NUL, which makes
 * tools treat a file as binary, and ESC, which starts terminal escape
 * sequences that would run when the file is printed.
 *
 * @param text - The text to clean
 * @returns The text without those characters
 */
const cleanContent = (text: string) =>
  // eslint-disable-next-line no-control-regex
  text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, "");

export default cleanContent;
