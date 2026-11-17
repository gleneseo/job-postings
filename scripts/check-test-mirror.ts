import { globSync } from "node:fs";
import findUnmirroredTests from "../src/helpers/find-unmirrored-tests.js";

const unmirrored = findUnmirroredTests(
  globSync("tests/unit/**/*.ts"),
  globSync("src/**/*.ts"),
);

if (unmirrored.length > 0) {
  console.error(
    `Unit tests must mirror src/. These have no source file at the matching path:\n${unmirrored.map((file) => `  ${file}`).join("\n")}`,
  );
  process.exitCode = 1;
}
