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
        { messageId: "singlePhraseEndsInFullStop" },
        { messageId: "singlePhraseEndsInFullStop" },
      ],
    },
  ],
});
