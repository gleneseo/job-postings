// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";
import vitest from "@vitest/eslint-plugin";
import tseslint from "typescript-eslint";

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
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      curly: ["error", "all"],
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
          // `vitest/valid-title` doesn't recognise the `@effect/vitest` variants, so check them here
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
