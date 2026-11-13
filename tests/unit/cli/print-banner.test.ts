import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestConsole } from "effect/testing";
import banner from "../../../src/cli/banner.js";
import printBanner from "../../../src/cli/print-banner.js";

const withTTY = <A, E, R>(isTTY: boolean, effect: Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      const original = process.stdout.isTTY;
      process.stdout.isTTY = isTTY;
      return original;
    }),
    () => effect,
    (original) =>
      Effect.sync(() => {
        process.stdout.isTTY = original;
      }),
  );

describe("printBanner", () => {
  it.effect(
    "should print the banner on an interactive terminal when not quiet",
    () =>
      Effect.gen(function* () {
        yield* withTTY(true, printBanner(false));
        assert.deepStrictEqual(yield* TestConsole.logLines, [banner]);
      }),
  );

  it.effect(
    "should not print the banner on an interactive terminal when quiet",
    () =>
      Effect.gen(function* () {
        yield* withTTY(true, printBanner(true));
        assert.deepStrictEqual(yield* TestConsole.logLines, []);
      }),
  );

  it.effect(
    "should not print the banner on a non-interactive terminal even when not quiet",
    () =>
      Effect.gen(function* () {
        yield* withTTY(false, printBanner(false));
        assert.deepStrictEqual(yield* TestConsole.logLines, []);
      }),
  );
});
