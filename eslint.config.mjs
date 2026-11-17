// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";
import vitest from "@vitest/eslint-plugin";
import tsdoc from "eslint-plugin-tsdoc";
import tseslint from "typescript-eslint";
import docStringFullStops from "./src/eslint-rules/doc-string-full-stops.ts";

export default defineConfig(
  {
    ignores: [
      "dist/**",
      ".coverage/**",
      ".eslint/**",
      ".data/**",
      ".workmux/**",
      "vitest.config.ts",
      "commitlint.config.js",
    ],
  },
  {
    files: ["**/*.{js,ts}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    plugins: {
      "import-x": importX,
      tsdoc,
      local: { rules: { "doc-string-full-stops": docStringFullStops } },
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      curly: ["error", "all"],
      "tsdoc/syntax": "error",
      "local/doc-string-full-stops": "error",
      "import-x/exports-last": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportNamedDeclaration[declaration!=null]",
          message:
            "Don't export inline. Define it first, then export it separately (e.g. `export { name };`) at the bottom of the file.",
        },
        {
          selector: "ExportDefaultDeclaration[declaration.type!='Identifier']",
          message:
            "Don't export the default value inline. Define it first, then `export default name;` at the bottom of the file.",
        },
        {
          // `vitest/valid-title` doesn't recognise the `@effect/vitest` variants, so check them here.
          // These selectors live in this block, which applies to every file, on purpose: a
          // `tests/**` block would replace this whole rule and drop the export selectors above
          selector:
            "CallExpression[callee.object.name='it'][callee.property.name=/^(effect|live|scoped|scopedLive)$/][arguments.0.type='Literal'][arguments.0.value!=/^should /]",
          message: 'Test labels must start with "should".',
        },
        {
          selector:
            "CallExpression[callee.object.object.name='it'][callee.object.property.name=/^(effect|live|scoped|scopedLive)$/][arguments.0.type='Literal'][arguments.0.value!=/^should /]",
          message: 'Test labels must start with "should".',
        },
      ],
    },
  },
  {
    files: ["tests/**/*.ts"],
    plugins: { vitest },
    settings: { vitest: { vitestImports: ["@effect/vitest"] } },
    rules: {
      "vitest/valid-title": [
        "error",
        {
          mustMatch: {
            it: ["^should ", 'Test labels must start with "should"'],
            test: ["^should ", 'Test labels must start with "should"'],
          },
        },
      ],
    },
  },
);
