import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestConsole } from "effect/testing";
import banner from "../../../../src/cli/banner.js";
import handleGleneseoHelpersCommand from "../../../../src/cli/command-handlers/handle-gleneseo-helpers-command.js";

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

describe("handleGleneseoHelpersCommand", () => {
  it.effect(
    "should print the banner and then show help when not quiet on an interactive terminal",
    () =>
      Effect.gen(function* () {
        const error = yield* withTTY(
          true,
          handleGleneseoHelpersCommand(false).pipe(Effect.flip),
        );

        assert.strictEqual(error._tag, "ShowHelp");
        assert.deepStrictEqual(yield* TestConsole.logLines, [banner]);
      }),
  );

  it.effect("should not print the banner when quiet", () =>
    Effect.gen(function* () {
      const error = yield* withTTY(
        true,
        handleGleneseoHelpersCommand(true).pipe(Effect.flip),
      );

      assert.strictEqual(error._tag, "ShowHelp");
      assert.deepStrictEqual(yield* TestConsole.logLines, []);
    }),
  );
});
