import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import ConfigFileLocator from "../../../src/config/config-file-locator.js";
import KeyFileResolver from "../../../src/config/key-file-resolver.js";
import KeyFileNotFoundError from "../../../src/config/key-file-not-found-error.js";
import FilePath from "../../../src/helpers/file-path.js";

/** Makes a locator that records its calls and reports the given existence */
const makeLocator = (exists: boolean) => {
  const calls: {
    explicitPath: Option.Option<typeof FilePath.Type>;
    fileName: string;
  }[] = [];
  const layer = Layer.succeed(ConfigFileLocator, {
    locate: (explicitPath, fileName) => {
      calls.push({ explicitPath, fileName });
      return Effect.succeed({
        path: Option.getOrElse(explicitPath, () => FilePath.make("/wk.json")),
        source: Option.isSome(explicitPath)
          ? ("flag" as const)
          : ("well-known location" as const),
        exists,
      });
    },
  });
  return { calls, layer };
};

const resolve = (
  explicit: Option.Option<typeof FilePath.Type>,
  locator: ReturnType<typeof makeLocator>,
) =>
  Effect.gen(function* () {
    const resolver = yield* KeyFileResolver;
    return yield* resolver.resolve(explicit);
  }).pipe(
    Effect.provide(KeyFileResolver.layer.pipe(Layer.provide(locator.layer))),
  );

describe("KeyFileResolver", () => {
  it.effect(
    "should locate job-postings.json with the explicit path and return the resolved file",
    () =>
      Effect.gen(function* () {
        const locator = makeLocator(true);
        const explicit = Option.some(FilePath.make("/k.json"));

        const result = yield* resolve(explicit, locator);

        assert.deepStrictEqual(result, { path: "/k.json", source: "flag" });
        assert.deepStrictEqual(locator.calls, [
          { explicitPath: explicit, fileName: "job-postings.json" },
        ]);
      }),
  );

  it.effect(
    "should fail with KeyFileNotFoundError when the file is missing",
    () =>
      Effect.gen(function* () {
        const error = yield* resolve(Option.none(), makeLocator(false)).pipe(
          Effect.flip,
        );

        assert.deepStrictEqual(
          error,
          new KeyFileNotFoundError({
            path: "/wk.json",
            source: "well-known location",
          }),
        );
      }),
  );
});
