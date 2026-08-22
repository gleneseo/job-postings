import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import createCsv from "../../../src/helpers/create-csv.js";

describe("createCsv", () => {
  it.effect("should join cells with commas and rows with newlines", () =>
    Effect.gen(function* () {
      const rows = [
        ["Company", "Role"],
        ["Acme", "Engineer"],
      ];
      expect(yield* createCsv(rows)).toBe("Company,Role\nAcme,Engineer");
    }),
  );

  it.effect("should quote cells containing commas", () =>
    Effect.gen(function* () {
      expect(yield* createCsv([["Acme, Inc.", "Engineer"]])).toBe(
        '"Acme, Inc.",Engineer',
      );
    }),
  );

  it.effect("should quote cells containing newlines", () =>
    Effect.gen(function* () {
      expect(yield* createCsv([["Acme", "Line one\nLine two"]])).toBe(
        'Acme,"Line one\nLine two"',
      );
    }),
  );

  it.effect("should quote and escape cells containing double quotes", () =>
    Effect.gen(function* () {
      expect(yield* createCsv([['Say "hi"', "Engineer"]])).toBe(
        '"Say ""hi""",Engineer',
      );
    }),
  );

  it.effect("should treat null and undefined cells as empty strings", () =>
    Effect.gen(function* () {
      expect(yield* createCsv([[null, undefined]])).toBe(",");
    }),
  );

  it.effect("should return an empty string for no rows", () =>
    Effect.gen(function* () {
      expect(yield* createCsv([])).toBe("");
    }),
  );

  it.effect(
    "should return an empty string for a single row with no cells",
    () =>
      Effect.gen(function* () {
        expect(yield* createCsv([[]])).toBe("");
      }),
  );

  it.effect("should leave empty string cells unquoted", () =>
    Effect.gen(function* () {
      expect(yield* createCsv([["", ""]])).toBe(",");
    }),
  );

  it.effect(
    "should quote a cell containing a comma, newline, and double quote together",
    () =>
      Effect.gen(function* () {
        expect(yield* createCsv([['a,b\nc"d', "e"]])).toBe('"a,b\nc""d",e');
      }),
  );

  it.effect("should not add a trailing newline after the last row", () =>
    Effect.gen(function* () {
      expect(yield* createCsv([["a"], ["b"]])).toBe("a\nb");
    }),
  );
});
