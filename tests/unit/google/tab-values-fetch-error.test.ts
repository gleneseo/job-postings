import { describe, expect, it } from "vitest";
import TabValuesFetchError from "../../../src/google/tab-values-fetch-error.js";

describe("TabValuesFetchError", () => {
  it("should tag itself as TabValuesFetchError", () => {
    const error = new TabValuesFetchError({
      tabIndex: 0,
      cause: new Error("network down"),
    });

    expect(error._tag).toBe("TabValuesFetchError");
  });

  it("should expose the underlying cause", () => {
    const cause = new Error("network down");
    const error = new TabValuesFetchError({ tabIndex: 0, cause });

    expect(error.cause).toBe(cause);
  });

  it("should expose the tab index whose values failed to fetch", () => {
    const error = new TabValuesFetchError({
      tabIndex: 3,
      cause: new Error("network down"),
    });

    expect(error.tabIndex).toBe(3);
  });

  it("should format a message including the tab index", () => {
    const error = new TabValuesFetchError({
      tabIndex: 3,
      cause: new Error("network down"),
    });

    expect(error.message).toBe("Failed to fetch values for tab [3]");
  });
});
