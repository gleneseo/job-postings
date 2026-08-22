import { describe, expect, it } from "vitest";
import SheetFetchError from "../../../src/google/sheet-fetch-error.js";

describe("SheetFetchError", () => {
  it("should tag itself as SheetFetchError", () => {
    const error = new SheetFetchError({ cause: new Error("network down") });

    expect(error._tag).toBe("SheetFetchError");
  });

  it("should expose the underlying cause", () => {
    const cause = new Error("network down");
    const error = new SheetFetchError({ cause });

    expect(error.cause).toBe(cause);
  });
});
