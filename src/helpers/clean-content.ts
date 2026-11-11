/**
 * Removes the characters that don't belong in a text or HTML file: control
 * characters (keeping tab, newline, and carriage return), U+FFFD, lone
 * surrogates, noncharacters, and the byte order mark
 *
 * @param text - The text to clean
 * @returns The text without those characters
 */
const cleanContent = (text: string) =>
  text
    .replace(
      // eslint-disable-next-line no-control-regex
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\ufffd\ufeff\ufffe\uffff]/g,
      "",
    )
    .replace(
      /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g,
      "",
    );

export default cleanContent;
