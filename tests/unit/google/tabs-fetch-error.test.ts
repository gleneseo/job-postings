import { describe, expect, it } from "vitest";
import TabsFetchError from "../../../src/google/tabs-fetch-error.js";

describe("TabsFetchError", () => {
  it("should tag itself as TabsFetchError", () => {
    const error = new TabsFetchError({ cause: new Error("network down") });

    expect(error._tag).toBe("TabsFetchError");
  });

  it("should expose the underlying cause", () => {
    const cause = new Error("network down");
    const error = new TabsFetchError({ cause });

    expect(error.cause).toBe(cause);
  });
});
