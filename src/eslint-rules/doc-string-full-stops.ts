import type { AST, Rule } from "eslint";

// A phrase ends at `.`, `!` or `?` followed by a capital, unless the full stop belongs to an abbreviation
const phraseBoundary = /(?<!\b(?:e\.g|i\.e|vs)\.)(?<=[.!?])\s+(?=[A-Z])/;
const tagLine = /^@(\w+)\s*/;

/**
 * Splits the body of a doc comment into its sections, i.e. the summary and
 * the description of each block tag, leaving out code blocks and `@example`
 * sections
 */
const sectionsOf = (commentValue: string): readonly string[] => {
  const sections: string[][] = [[]];
  let inCodeBlock = false;
  let skipping = false;

  for (const rawLine of commentValue.split("\n")) {
    const line = rawLine.replace(/^\s*\*?\s?/, "").trimEnd();
    const tag = tagLine.exec(line);

    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
    } else if (!inCodeBlock && tag !== null) {
      skipping = tag[1] === "example";
      sections.push([line.slice(tag[0].length)]);
    } else if (!inCodeBlock && !skipping) {
      sections.at(-1)?.push(line);
    }
  }

  return sections.map((lines) => lines.join("\n"));
};

/** Splits a section into its phrases: sentences, and paragraphs */
const phrasesOf = (section: string): readonly string[] =>
  section
    .split(/\n\s*\n/)
    .flatMap((paragraph) =>
      paragraph.trim().replaceAll("\n", " ").split(phraseBoundary),
    )
    .filter((phrase) => phrase !== "");

/** Reports doc strings whose full stops break the rule in `CODING_STANDARDS.md` */
const docStringFullStops: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "A doc string ends in a full stop only when it has several phrases, and then every phrase does",
    },
    messages: {
      singlePhraseEndsInFullStop:
        "A doc string with a single phrase must not end in a full stop.",
      multiplePhrasesNeedFullStops:
        "A doc string with several phrases must end every phrase, including the last, in a full stop.",
    },
    schema: [],
  },
  create: (context) => ({
    Program: () => {
      for (const comment of context.sourceCode.getAllComments()) {
        if (comment.type !== "Block" || !comment.value.startsWith("*")) {
          continue;
        }

        for (const section of sectionsOf(comment.value)) {
          const phrases = phrasesOf(section);
          // ESLint always sets `loc` on comments; the type just marks it optional
          const loc = comment.loc as AST.SourceLocation;

          if (phrases.length === 1 && phrases[0]?.endsWith(".") === true) {
            context.report({ loc, messageId: "singlePhraseEndsInFullStop" });
          } else if (
            phrases.length > 1 &&
            !phrases.every((phrase) => phrase.endsWith("."))
          ) {
            context.report({ loc, messageId: "multiplePhrasesNeedFullStops" });
          }
        }
      }
    },
  }),
};

export default docStringFullStops;
