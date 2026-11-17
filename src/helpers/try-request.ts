import { Cause, Duration, Effect } from "effect";
import RequestLabel from "./request-label.js";

/** Describes a network request and how to report its failure */
interface TryRequestOptions<A, E extends Error> {
  /** Starts the request */
  readonly try: () => Promise<A>;
  /** Names the request in its timeout message */
  readonly label: typeof RequestLabel.Type;
  /** Builds the domain error from the failure's cause */
  readonly toError: (cause: unknown) => E;
  /** Maximum time to wait for the request */
  readonly timeout: Duration.Duration;
}

/**
 * Runs a network request, failing with a domain error if the request
 * rejects or takes longer than the timeout
 *
 * @param options - The request to run and how to report its failure
 * @returns An Effect that resolves to the request's response
 */
const tryRequest = <A, E extends Error>(
  options: TryRequestOptions<A, E>,
): Effect.Effect<A, E> =>
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
