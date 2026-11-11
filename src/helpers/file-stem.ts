import cleanContent from "./clean-content.js";

const MAX_NAME_LENGTH = 150;

/**
 * Derives a safe file name stem from an email subject, replacing characters
 * that are invalid in file names and truncating long subjects
 *
 * @param subject - The email subject
 * @returns The file name stem, or `(no subject)` if nothing usable remains
 */
const fileStem = (subject: string) => {
  const stem = cleanContent(subject)
    // eslint-disable-next-line no-control-regex
    .replace(/[/\\:*?"<>|\x00-\x1f]/g, "_")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return stem === "" || /^\.+$/.test(stem) ? "(no subject)" : stem;
};

export default fileStem;
