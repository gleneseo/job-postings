import { describe, expect, it } from "vitest";
import htmlComment from "../../../src/helpers/html-comment.js";

describe("htmlComment", () => {
  it("should wrap the text in an HTML comment", () => {
    expect(htmlComment("Subject: Hello")).toBe("<!-- Subject: Hello -->");
  });

  it("should keep single hyphens", () => {
    expect(htmlComment("Re: follow-up")).toBe("<!-- Re: follow-up -->");
  });

  it("should separate consecutive hyphens so the text can't close the comment", () => {
    expect(htmlComment("a --> b --!> c --- d")).toBe(
      "<!-- a - -> b - -!> c - - - d -->",
    );
  });
});
