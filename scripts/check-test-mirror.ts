// This is a build script, not part of the app, so it uses plain TypeScript and Node APIs rather than Effect
import { globSync } from "node:fs";
import { sep } from "node:path";
import findUnmirroredTests from "../src/helpers/find-unmirrored-tests.js";

/** Lists the files matching a pattern, with `/` separators on every platform */
const listFiles = (pattern: string): string[] =>
  globSync(pattern).map((file) => file.replaceAll(sep, "/"));

const unmirrored = findUnmirroredTests(
  listFiles("tests/unit/**/*.ts"),
  listFiles("src/**/*.ts"),
);

if (unmirrored.length > 0) {
  console.error(
    `Unit tests must mirror src/. These have no source file at the matching path:\n${unmirrored.map((file) => `  ${file}`).join("\n")}`,
  );
  process.exitCode = 1;
}
