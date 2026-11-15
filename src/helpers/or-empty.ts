import { Option } from "effect";

/**
 * Defaults a string that may be missing, as third-party API responses often
 * leave it
 *
 * @param value - The string, or `null`/`undefined` when it is missing
 * @returns The string, or an empty string when it is missing
 */
const orEmpty = (value: string | null | undefined) =>
  Option.fromNullishOr(value).pipe(Option.getOrElse(() => ""));

export default orEmpty;
