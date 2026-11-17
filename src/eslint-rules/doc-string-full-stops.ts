import type { AST, Rule } from "eslint";

// A phrase ends at `.`, `!` or `?` followed by a capital, a backtick, a digit or an inline tag, unless the
// full stop belongs to an abbreviation
const phraseBoundary = /(?<!\b(?:e\.g|i\.e|vs)\.)(?<=[.!?])\s+(?=[A-Z`\d]|\{@)/;
const tagLine = /^@(\w+)\s*/;
const listItem = /^(?:[-*+]|\d+[.)])\s+/;

/** A part of a doc comment that is checked on its own, and the line it starts on */
interface Section {
  /** The text of the section */
  readonly text: string;
  /** Zero-based index of the line of the comment the section starts on */
  readonly line: number;
}

/**
 * Splits the body of a doc comment into its sections, i.e. the summary and
 * the description of each block tag, leaving out code blocks, lists and
 * `@example` sections
 */
const sectionsOf = (commentValue: string): readonly Section[] => {
  const summary: { lines: string[]; line: number } = { lines: [], line: 0 };
  const sections = [summary];
  let current = summary;
  let inCodeBlock = false;
  let inList = false;
  let skipping = false;

  for (const [index, rawLine] of commentValue.split("\n").entries()) {
    const line = rawLine.replace(/^\s*\*?\s?/, "").trimEnd();
    const tag = tagLine.exec(line);

    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
    } else if (inCodeBlock) {
      continue;
    } else if (tag !== null) {
      inList = false;
      skipping = tag[1] === "example";
      current = { lines: [line.slice(tag[0].length)], line: index };
      sections.push(current);
    } else if (listItem.test(line)) {
      inList = true;
    } else if (inList && /^\s/.test(line)) {
      // a continuation of the previous list item
    } else {
      inList = false;
      if (!skipping) {
        // the summary starts on its first line with text
        if (
          current === summary &&
          line !== "" &&
          current.lines.every((existing) => existing === "")
        ) {
          current.line = index;
        }
        current.lines.push(line);
      }
    }
  }

  return sections.map(({ lines, line }) => ({ text: lines.join("\n"), line }));
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

        // ESLint always sets `loc` on comments; the type just marks it optional
        const commentLine = (comment.loc as AST.SourceLocation).start.line;

        for (const section of sectionsOf(comment.value)) {
          const phrases = phrasesOf(section.text);
          const loc = { line: commentLine + section.line, column: 0 };

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
