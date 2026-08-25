// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";
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
      ],
    },
  },
);
