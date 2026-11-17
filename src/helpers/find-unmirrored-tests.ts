const testPrefix = "tests/unit/";
const testSuffix = ".test.ts";

/**
 * Finds the unit tests that have no source file at the mirrored path, i.e.
 * `tests/unit/<path>/<name>.test.ts` tests `src/<path>/<name>.ts`
 *
 * @param testFiles - Paths of the files under `tests/unit`, relative to the repository root
 * @param sourceFiles - Paths of the files under `src`, relative to the repository root
 * @returns The unit tests with no matching source file, ignoring files that are not unit tests
 */
const findUnmirroredTests = (
  testFiles: readonly string[],
  sourceFiles: readonly string[],
): readonly string[] =>
  testFiles.filter(
    (testFile) =>
      testFile.startsWith(testPrefix) &&
      testFile.endsWith(testSuffix) &&
      !sourceFiles.includes(
        `src/${testFile.slice(testPrefix.length, -testSuffix.length)}.ts`,
      ),
  );

export default findUnmirroredTests;
