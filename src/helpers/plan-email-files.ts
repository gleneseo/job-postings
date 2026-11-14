import cleanContent from "./clean-content.js";
import cleanHeader from "./clean-header.js";
import type Email from "./email.js";
import fileStem from "./file-stem.js";
import htmlComment from "./html-comment.js";

/**
 * Decides the name and content of the file to write for each email: a
 * `.txt` file with headers and the plain-text body, or a `.html` file for an
 * email with only an HTML body, with the same headers as HTML comments. When
 * two emails share a subject, the later one (by Gmail message ID) gets its ID
 * appended to its name.
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

      const headers = [
        `From: ${cleanHeader(email.from.name)} <${cleanHeader(email.from.email)}>`,
        `To: ${cleanHeader(email.to.name)} <${cleanHeader(email.to.email)}>`,
        `Subject: ${cleanHeader(email.subject)}`,
        `Received: ${email.receivedAt}`,
      ];
      const content = htmlOnly
        ? headers.map((header) => `${htmlComment(header)}\n`).join("") +
          cleanContent(email.htmlBody)
        : `${headers.join("\n")}\n\n${cleanContent(email.textBody)}`;
      return { name, content };
    });
};

export default planEmailFiles;
