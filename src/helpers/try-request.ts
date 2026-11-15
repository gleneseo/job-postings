import { Cause, Duration, Effect } from "effect";
import RequestLabel from "./request-label.js";

/**
 * Runs a network request, failing with a domain error if the request
 * rejects or takes longer than the timeout
 *
 * @param options - The request to run and how to report its failure
 * @param options.try - Starts the request
 * @param options.label - Names the request in its timeout message
 * @param options.toError - Builds the domain error from the failure's cause
 * @param options.timeout - Maximum time to wait for the request
 * @returns An Effect that resolves to the request's response
 */
const tryRequest = <A, E extends Error>(options: {
  readonly try: () => Promise<A>;
  readonly label: typeof RequestLabel.Type;
  readonly toError: (cause: unknown) => E;
  readonly timeout: Duration.Duration;
}): Effect.Effect<A, E> =>
  Effect.tryPromise({ try: options.try, catch: options.toError }).pipe(
    Effect.timeoutOrElse({
      duration: options.timeout,
      orElse: () =>
        Effect.fail(
          options.toError(
            new Cause.TimeoutError(
              `${options.label} timed out after ${Duration.format(options.timeout)}`,
            ),
          ),
        ),
    }),
  );

export default tryRequest;
