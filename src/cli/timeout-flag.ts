import { Flag } from "effect/cli";
import TimeoutSeconds from "../helpers/timeout-seconds.js";

/**
 * Builds a Helper's `--timeout` flag: the network request timeout, in whole
 * seconds greater than 0, applied to each call to the Helper's API
 *
 * @param defaultSeconds - The timeout when the flag is omitted
 * @param api - The API the Helper calls, named in the description (e.g.
 * `Gmail`)
 * @returns The `--timeout` flag
 */
const timeoutFlag = (
  defaultSeconds: typeof TimeoutSeconds.Type,
  api: string,
): Flag.Flag<typeof TimeoutSeconds.Type> =>
  Flag.Int("timeout").pipe(
    Flag.filter(
      (n) => n > 0,
      (n) => `--timeout must be greater than 0 seconds (got ${n.toString()})`,
    ),
    Flag.withSchema(TimeoutSeconds),
    Flag.withDefault(defaultSeconds),
    Flag.withDescription(
      `Network request timeout, in seconds, for each ${api} API call (default: ${defaultSeconds.toString()})`,
    ),
  );

export default timeoutFlag;
