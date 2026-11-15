import { Option } from "effect";

/**
 * Defaults an array that may be missing, as third-party API responses often
 * leave it
 *
 * @param value - The array, or `null`/`undefined` when it is missing
 * @returns The array, or an empty array when it is missing
 */
const orEmptyArray = <A>(value: A[] | null | undefined) =>
  Option.fromNullishOr(value).pipe(Option.getOrElse((): A[] => []));

export default orEmptyArray;
