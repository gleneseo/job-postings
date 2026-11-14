/**
 * Wraps a single line of text in an HTML comment, separating every pair of
 * consecutive hyphens so the text can't close the comment early (e.g. with
 * `-->` or `--!>`)
 *
 * @param text - The single line of text to put in the comment
 * @returns The HTML comment
 */
const htmlComment = (text: string) =>
  `<!-- ${text.replace(/-(?=-)/g, "- ")} -->`;

export default htmlComment;
