import { assert, describe, it } from "@effect/vitest";
import { Cause, Duration, Effect, Fiber, Function, Schema } from "effect";
import { TestClock } from "effect/testing";
import RequestLabel from "../../../src/helpers/request-label.js";
import tryRequest from "../../../src/helpers/try-request.js";

/** Stand-in for a domain error raised by a failed request */
class TestRequestError extends Schema.TaggedError<TestRequestError>()(
  "TestRequestError",
  {
    /** The underlying error that caused the request to fail */
    cause: Schema.Defect(),
  },
) {}

const label = RequestLabel.make("Test request");
const timeout = Duration.seconds(5);
const toError = (cause: unknown) => new TestRequestError({ cause });

describe("tryRequest", () => {
  it.effect("should succeed with the value the request resolves to", () =>
    Effect.gen(function* () {
      const result = yield* tryRequest({
        try: () => Promise.resolve("response"),
        label,
        toError,
        timeout,
      });

      assert.strictEqual(result, "response");
    }),
  );

  it.effect("should fail with the domain error when the request rejects", () =>
    Effect.gen(function* () {
      const rejection = new Error("connection reset");

      const error = yield* tryRequest({
        try: () => Promise.reject(rejection),
        label,
        toError,
        timeout,
      }).pipe(Effect.flip);

      assert.instanceOf(error, TestRequestError);
      assert.strictEqual(error.cause, rejection);
    }),
  );

  it.effect(
    "should fail with the domain error wrapping a timeout when the request outlasts the timeout",
    () =>
      Effect.gen(function* () {
        const fiber = yield* tryRequest({
          try: () => new Promise<never>(Function.constVoid),
          label,
          toError,
          timeout,
        }).pipe(Effect.flip, Effect.forkChild);
        yield* TestClock.adjust(Duration.seconds(6));

        const error = yield* Fiber.join(fiber);

        assert.instanceOf(error, TestRequestError);
        assert.instanceOf(error.cause, Cause.TimeoutError);
        assert.strictEqual(
          error.cause.message,
          "Test request timed out after 5s",
        );
      }),
  );
});
