import { describe, expect, it } from "vitest";
import NoTabDataError from "../../../src/google/no-tab-data-error.js";

describe("NoTabDataError", () => {
  it("should tag itself as NoTabDataError", () => {
    const error = new NoTabDataError({ tabIndex: 0 });

    expect(error._tag).toBe("NoTabDataError");
  });

  it("should expose the tab index that has no rows", () => {
    const error = new NoTabDataError({ tabIndex: 3 });

    expect(error.tabIndex).toBe(3);
  });

  it("should format a message including the tab index", () => {
    const error = new NoTabDataError({ tabIndex: 3 });

    expect(error.message).toBe("The tab at index [3] does not have any rows");
  });
});
