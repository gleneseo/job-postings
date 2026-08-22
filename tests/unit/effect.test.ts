import { assert, describe, it } from "@effect/vitest";
import { Effect, Exit } from "effect";

function divide(a: number, b: number): Effect.Effect<number, string> {
  if (b === 0) {
    return Effect.fail("Cannot divide by zero");
  }
  return Effect.succeed(a / b);
}

describe("divide", () => {
  it.effect("succeeds with the quotient", () =>
    Effect.gen(function* () {
      const result = yield* divide(4, 2);

      assert.strictEqual(result, 2);
    }),
  );

  it.effect("fails when dividing by zero", () =>
    Effect.gen(function* () {
      const result = yield* Effect.exit(divide(4, 0));

      assert.deepStrictEqual(result, Exit.fail("Cannot divide by zero"));
    }),
  );
});
