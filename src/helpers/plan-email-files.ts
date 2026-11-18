import { Array, Order } from "effect";
import cleanContent from "./clean-content.js";
import cleanHeader from "./clean-header.js";
import type Email from "./email.js";
import fileStem from "./file-stem.js";
import htmlComment from "./html-comment.js";

/**
 * Written at the start of HTML files, where browsers give it precedence over
 * any `<meta>` charset the email's HTML declares, since the files are always
 * written as UTF-8
 */
const UTF8_BOM = "\ufeff";

/**
 * Decides the name and content of the file to write for each email: a
 * `.txt` file with headers and the plain-text body, or a `.html` file for an
 * email with only an HTML body, with the same headers as HTML comments and a
 * UTF-8 byte order mark so browsers decode it as UTF-8 even when the HTML
 * declares another charset. Each file name starts with the email's Gmail
 * message ID, so every name is unique even when two emails share a subject.
 *
 * @param emails - The emails to write
 * @returns The files to write, ordered by Gmail message ID
 */
const planEmailFiles = (emails: readonly (typeof Email.Type)[]) =>
  Array.map(
    Array.sort(
      emails,
      Order.mapInput(Order.String, (email: typeof Email.Type) => email.id),
    ),
    (email) => {
      const htmlOnly =
        email.textBody.trim() === "" && email.htmlBody.trim() !== "";
      const extension = htmlOnly ? "html" : "txt";
      const name = `${email.id} - ${fileStem(email.subject)}.${extension}`;

      const headers = [
        `From: ${cleanHeader(email.from.name)} <${cleanHeader(email.from.email)}>`,
        `To: ${cleanHeader(email.to.name)} <${cleanHeader(email.to.email)}>`,
        `Subject: ${cleanHeader(email.subject)}`,
        `Received: ${email.receivedAt}`,
        `Gmail-Message-ID: ${email.id}`,
      ];
      const content = htmlOnly
        ? UTF8_BOM +
          headers.map((header) => `${htmlComment(header)}\n`).join("") +
          cleanContent(email.htmlBody)
        : `${headers.join("\n")}\n\n${cleanContent(email.textBody)}`;
      return { name, content };
    },
  );

export default planEmailFiles;
