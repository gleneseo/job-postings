import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import docStringFullStops from "../../../src/eslint-rules/doc-string-full-stops.js";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run("doc-string-full-stops", docStringFullStops, {
  valid: [
    // single phrase, no full stop
    "/** Does a thing */\nconst a = 1;",
    // several phrases, every one ends in a full stop
    "/** Does a thing. Then does another. */\nconst a = 1;",
    // several paragraphs, every one ends in a full stop
    "/**\n * Does a thing.\n *\n * Does another.\n */\nconst a = 1;",
    // a multi-line single phrase
    "/**\n * Does a thing\n * over two lines\n */\nconst a = 1;",
    // tag descriptions follow the same rule
    "/**\n * Does a thing\n *\n * @param x - The input\n * @returns The output\n */\nconst a = 1;",
    "/**\n * Does a thing\n *\n * @returns The output. Or nothing.\n */\nconst a = 1;",
    // a lowercase continuation after a full stop is not a new phrase
    "/** Does a thing, e.g. adds one */\nconst a = 1;",
    // code blocks and empty sections are skipped
    "/**\n * Does a thing\n *\n * @example\n * ```ts\n * add(1, 2);\n * ```\n * @internal\n */\nconst a = 1;",
    // abbreviations before a capital don't end a phrase
    "/** Reads mail, e.g. Gmail messages */\nconst a = 1;",
    "/** Reads mail, i.e. Gmail messages */\nconst a = 1;",
    "/** Compares Drive vs. Gmail */\nconst a = 1;",
    "/** Reads mail, e.g. Gmail. Then sends it. */\nconst a = 1;",
    // a sentence may start with a backtick, a digit or an inline tag
    "/** Does a thing. `foo` is used. */\nconst a = 1;",
    "/** Does a thing. 2 retries are made. */\nconst a = 1;",
    "/** Does a thing. {@link Other} does another. */\nconst a = 1;",
    // list items are not phrases, however they are written
    "/**\n * Downloads emails in one of two ways:\n *\n * - all emails from a sender\n * - only the emails not yet stored\n */\nconst a = 1;",
    "/**\n * Downloads emails in one of two ways:\n * - all emails from a sender\n * - only the emails not yet stored\n */\nconst a = 1;",
    "/**\n * Downloads emails in this order:\n *\n * 1. all emails from a sender\n * 2) only the emails not yet stored\n * + the rest\n */\nconst a = 1;",
    "/**\n * Downloads emails in one of two ways:\n *\n * - all emails from a sender,\n *   oldest first\n * - only the emails not yet stored\n */\nconst a = 1;",
    "/**\n * Downloads emails\n *\n * @returns The emails in one of two orders:\n * - oldest first\n * - newest first\n */\nconst a = 1;",
    // an @example section is skipped even without a code block
    "/**\n * Does a thing\n *\n * @example\n * add(1, 2). Prints 3.\n */\nconst a = 1;",
    // only doc comments are checked
    "// Does a thing.\nconst a = 1;",
    "/* Does a thing. */\nconst a = 1;",
  ],
  invalid: [
    {
      code: "/** Does a thing. */\nconst a = 1;",
      errors: [{ messageId: "singlePhraseEndsInFullStop" }],
    },
    {
      code: "/** Does a thing. Then does another */\nconst a = 1;",
      errors: [{ messageId: "multiplePhrasesNeedFullStops" }],
    },
    {
      code: "/**\n * Does a thing.\n *\n * Does another\n */\nconst a = 1;",
      errors: [{ messageId: "multiplePhrasesNeedFullStops" }],
    },
    {
      code: "/** Reads mail, e.g. Gmail. Then sends it */\nconst a = 1;",
      errors: [{ messageId: "multiplePhrasesNeedFullStops" }],
    },
    {
      code: "/** Reads mail, e.g. Gmail messages. */\nconst a = 1;",
      errors: [{ messageId: "singlePhraseEndsInFullStop" }],
    },
    {
      code: "/**\n * Does a thing\n *\n * @param x - The input.\n */\nconst a = 1;",
      errors: [{ messageId: "singlePhraseEndsInFullStop" }],
    },
    {
      code: "/**\n * Does a thing\n *\n * @returns The output. Or nothing\n */\nconst a = 1;",
      errors: [{ messageId: "multiplePhrasesNeedFullStops" }],
    },
    {
      code: "/**\n * Does a thing.\n *\n * @param x - The input.\n */\nconst a = 1;",
      errors: [
        { messageId: "singlePhraseEndsInFullStop", line: 2 },
        { messageId: "singlePhraseEndsInFullStop", line: 4 },
      ],
    },
    {
      code: "/**\n * Does a thing\n *\n * @param x - The input.\n * @returns The output. Or nothing\n */\nconst a = 1;",
      errors: [
        { messageId: "singlePhraseEndsInFullStop", line: 4 },
        { messageId: "multiplePhrasesNeedFullStops", line: 5 },
      ],
    },
    {
      code: "\n\n/** Does a thing. */\nconst a = 1;",
      errors: [{ messageId: "singlePhraseEndsInFullStop", line: 3 }],
    },
    {
      code: "/** Does a thing. `foo` is used */\nconst a = 1;",
      errors: [{ messageId: "multiplePhrasesNeedFullStops" }],
    },
    {
      code: "/** Does a thing. 2 retries are made */\nconst a = 1;",
      errors: [{ messageId: "multiplePhrasesNeedFullStops" }],
    },
    {
      code: "/** Does a thing. {@link Other} does another */\nconst a = 1;",
      errors: [{ messageId: "multiplePhrasesNeedFullStops" }],
    },
    // list items are skipped, so the lead-in is a single phrase whatever the items end in
    {
      code: "/**\n * Downloads emails.\n *\n * - Fetches every email from the sender.\n * - Skips the ones already stored.\n */\nconst a = 1;",
      errors: [{ messageId: "singlePhraseEndsInFullStop", line: 2 }],
    },
    {
      code: "/**\n * Does a thing.\n *\n * - a\n * - b\n *\n * Then another\n */\nconst a = 1;",
      errors: [{ messageId: "multiplePhrasesNeedFullStops", line: 2 }],
    },
  ],
});
