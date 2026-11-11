import cleanContent from "./clean-content.js";
import cleanHeader from "./clean-header.js";
import type Email from "./email.js";
import fileStem from "./file-stem.js";

/**
 * Decides the name and content of the file to write for each email: a
 * `.txt` file with headers and the plain-text body, or a `.html` file for an
 * email with only an HTML body. When two emails share a subject, the later
 * one (by Gmail message ID) gets its ID appended to its name.
 *
 * @param emails - The emails to write
 * @returns The files to write, ordered by Gmail message ID
 */
const planEmailFiles = (emails: readonly (typeof Email.Type)[]) => {
  const used = new Set<string>();
  return [...emails]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((email) => {
      const htmlOnly =
        email.textBody.trim() === "" && email.htmlBody.trim() !== "";
      const extension = htmlOnly ? "html" : "txt";
      const stem = fileStem(email.subject);
      let name = `${stem}.${extension}`;
      if (used.has(name)) {
        name = `${stem} (${email.id}).${extension}`;
      }
      used.add(name);

      const content = htmlOnly
        ? `<!-- Received: ${email.receivedAt} -->\n${cleanContent(email.htmlBody)}`
        : `From: ${cleanHeader(email.from.name)} <${cleanHeader(email.from.email)}>\n` +
          `To: ${cleanHeader(email.to.name)} <${cleanHeader(email.to.email)}>\n` +
          `Subject: ${cleanHeader(email.subject)}\n` +
          `Received: ${email.receivedAt}\n\n` +
          cleanContent(email.textBody);
      return { name, content };
    });
};

export default planEmailFiles;
