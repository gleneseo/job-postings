import { describe, expect, it } from "vitest";
import sortRows from "../../../src/helpers/sort-rows.js";

describe("sortRows", () => {
  const headers = ["Company", "Last Contact"];

  it("should sort rows by Last Contact date ascending", () => {
    const rows = [
      ["Acme", "12/25/2026"],
      ["Globex", "1/1/2026"],
      ["Initech", "6/15/2026"],
    ];
    expect(sortRows(rows, headers)).toEqual([
      ["Globex", "1/1/2026"],
      ["Initech", "6/15/2026"],
      ["Acme", "12/25/2026"],
    ]);
  });

  it("should place rows without a Last Contact date before dated rows", () => {
    const rows = [
      ["Acme", "1/1/2026"],
      ["Globex", ""],
    ];
    expect(sortRows(rows, headers)).toEqual([
      ["Globex", ""],
      ["Acme", "1/1/2026"],
    ]);
  });

  it("should keep a dated row after an already-earlier undated row", () => {
    const rows = [
      ["Globex", ""],
      ["Acme", "1/1/2026"],
    ];
    expect(sortRows(rows, headers)).toEqual([
      ["Globex", ""],
      ["Acme", "1/1/2026"],
    ]);
  });

  it("should sort rows without a Last Contact date alphabetically by Company", () => {
    const rows = [
      ["Globex", ""],
      ["Acme", ""],
      ["Initech", ""],
    ];
    expect(sortRows(rows, headers)).toEqual([
      ["Acme", ""],
      ["Globex", ""],
      ["Initech", ""],
    ]);
  });

  it("should treat a whitespace-only Last Contact value as no date", () => {
    const rows = [
      ["Acme", "1/1/2026"],
      ["Globex", "   "],
    ];
    expect(sortRows(rows, headers)).toEqual([
      ["Globex", "   "],
      ["Acme", "1/1/2026"],
    ]);
  });

  it("should treat a missing Last Contact cell as no date", () => {
    const rows = [["Acme", "1/1/2026"], ["Globex"]];
    expect(sortRows(rows, headers)).toEqual([["Globex"], ["Acme", "1/1/2026"]]);
  });

  it("should keep a dated row after an already-earlier row missing a Last Contact cell", () => {
    const rows = [["Globex"], ["Acme", "1/1/2026"]];
    expect(sortRows(rows, headers)).toEqual([["Globex"], ["Acme", "1/1/2026"]]);
  });

  it("should treat a missing Company cell as an empty company when breaking ties", () => {
    const rows = [[""], ["", "Alpha"]];
    expect(sortRows(rows, ["Last Contact", "Company"])).toEqual([
      [""],
      ["", "Alpha"],
    ]);
  });

  it("should fall back to a Company sort when the Last Contact header is missing", () => {
    const rows = [
      ["Globex", "1/1/2026"],
      ["Acme", "12/25/2026"],
    ];
    expect(sortRows(rows, ["Company"])).toEqual([
      ["Acme", "12/25/2026"],
      ["Globex", "1/1/2026"],
    ]);
  });

  it("should preserve the original order when both Company and Last Contact headers are missing", () => {
    const rows = [
      ["Globex", "1/1/2026"],
      ["Acme", "12/25/2026"],
    ];
    expect(sortRows(rows, [])).toEqual([
      ["Globex", "1/1/2026"],
      ["Acme", "12/25/2026"],
    ]);
  });

  it("should sort rows with the same Last Contact date alphabetically by Company", () => {
    const rows = [
      ["Globex", "1/1/2026"],
      ["Acme", "1/1/2026"],
    ];
    expect(sortRows(rows, headers)).toEqual([
      ["Acme", "1/1/2026"],
      ["Globex", "1/1/2026"],
    ]);
  });

  it("should not mutate the input array", () => {
    const rows = [
      ["Acme", "12/25/2026"],
      ["Globex", "1/1/2026"],
    ];
    const original = rows.map((row) => [...row]);
    sortRows(rows, headers);
    expect(rows).toEqual(original);
  });

  it("should return an empty array for no data rows", () => {
    expect(sortRows([], headers)).toEqual([]);
  });
});
