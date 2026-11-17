import { assert, describe, it } from "vitest";
import findUnmirroredTests from "../../../src/helpers/find-unmirrored-tests.js";

describe("findUnmirroredTests", () => {
  it("should return nothing when every test has a matching source file", () => {
    const result = findUnmirroredTests(
      ["tests/unit/helpers/sort.test.ts", "tests/unit/google/drive.test.ts"],
      ["src/helpers/sort.ts", "src/google/drive.ts", "src/index.ts"],
    );

    assert.deepStrictEqual(result, []);
  });

  it("should return the tests that have no matching source file", () => {
    const result = findUnmirroredTests(
      ["tests/unit/helpers/sort.test.ts", "tests/unit/helpers/brands.test.ts"],
      ["src/helpers/sort.ts", "src/helpers/file-path.ts"],
    );

    assert.deepStrictEqual(result, ["tests/unit/helpers/brands.test.ts"]);
  });

  it("should not match a source file in a different folder", () => {
    const result = findUnmirroredTests(
      ["tests/unit/helpers/drive.test.ts"],
      ["src/google/drive.ts"],
    );

    assert.deepStrictEqual(result, ["tests/unit/helpers/drive.test.ts"]);
  });

  it("should ignore files that are not unit tests", () => {
    const result = findUnmirroredTests(
      ["tests/unit/helpers/fixtures.ts", "tests/unit/helpers/data.json"],
      [],
    );

    assert.deepStrictEqual(result, []);
  });
});
