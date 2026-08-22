import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import sortValues from "../../../src/helpers/sort-values.js";

describe("sortValues", () => {
  const headerRow = ["Company", "Last Contact"];

  it.effect("should keep the header row in place and sort the data rows", () =>
    Effect.gen(function* () {
      const values = [
        headerRow,
        ["Acme", "12/25/2026"],
        ["Globex", "1/1/2026"],
      ];

      expect(yield* sortValues(values)).toEqual([
        headerRow,
        ["Globex", "1/1/2026"],
        ["Acme", "12/25/2026"],
      ]);
    }),
  );

  it.effect(
    "should return only the header row when there are no data rows",
    () =>
      Effect.gen(function* () {
        expect(yield* sortValues([headerRow])).toEqual([headerRow]);
      }),
  );

  it.effect("should return an empty array when given no values", () =>
    Effect.gen(function* () {
      expect(yield* sortValues([])).toEqual([]);
    }),
  );

  it.effect(
    "should omit an empty header row and treat the remaining rows as data",
    () =>
      Effect.gen(function* () {
        const values = [[], ["Globex", "1/1/2026"], ["Acme", "12/25/2026"]];

        expect(yield* sortValues(values)).toEqual([
          ["Globex", "1/1/2026"],
          ["Acme", "12/25/2026"],
        ]);
      }),
  );
});
