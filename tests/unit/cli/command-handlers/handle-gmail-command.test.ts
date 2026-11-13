import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { TestConsole } from "effect/testing";
import banner from "../../../../src/cli/banner.js";
import handleGmailCommand from "../../../../src/cli/command-handlers/handle-gmail-command.js";

const placeholder = "The gmail helper is not implemented yet.";

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

describe("handleGmailCommand", () => {
  it.effect(
    "should print the banner and the placeholder message when not quiet on an interactive terminal",
    () =>
      Effect.gen(function* () {
        yield* withTTY(true, handleGmailCommand(false));

        assert.deepStrictEqual(yield* TestConsole.logLines, [banner]);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [placeholder]);
      }),
  );

  it.effect("should only print the placeholder message when quiet", () =>
    Effect.gen(function* () {
      yield* withTTY(true, handleGmailCommand(true));

      assert.deepStrictEqual(yield* TestConsole.logLines, []);
      assert.deepStrictEqual(yield* TestConsole.errorLines, [placeholder]);
    }),
  );
});
