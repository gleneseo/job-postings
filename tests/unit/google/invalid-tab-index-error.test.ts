import { describe, expect, it } from "vitest";
import InvalidTabIndexError from "../../../src/google/invalid-tab-index-error.js";

describe("InvalidTabIndexError", () => {
  it("should tag itself as InvalidTabIndexError", () => {
    const error = new InvalidTabIndexError({
      indexRequested: 2,
      totalCount: 1,
    });

    expect(error._tag).toBe("InvalidTabIndexError");
  });

  it("should expose the tab index that was requested", () => {
    const error = new InvalidTabIndexError({
      indexRequested: 2,
      totalCount: 1,
    });

    expect(error.indexRequested).toBe(2);
  });

  it("should expose the total number of available tabs", () => {
    const error = new InvalidTabIndexError({
      indexRequested: 2,
      totalCount: 1,
    });

    expect(error.totalCount).toBe(1);
  });

  it("should format a message including the requested index and total count", () => {
    const error = new InvalidTabIndexError({
      indexRequested: 2,
      totalCount: 1,
    });

    expect(error.message).toBe(
      "Tab index [2] is invalid; only [1] tab(s) available",
    );
  });
});
