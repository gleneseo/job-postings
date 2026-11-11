import { describe, expect, it } from "vitest";
import buildGmailQuery from "../../../src/helpers/build-gmail-query.js";
import Sender from "../../../src/helpers/sender.js";

describe("buildGmailQuery", () => {
  it("should match every inbox email when there are no senders", () => {
    expect(buildGmailQuery([])).toBe("in:inbox");
  });

  it("should restrict the inbox to a single sender", () => {
    expect(buildGmailQuery([Sender.make("ziprecruiter.com")])).toBe(
      "in:inbox from:ziprecruiter.com",
    );
  });

  it("should match any of several senders", () => {
    expect(
      buildGmailQuery([
        Sender.make("linkedin.com"),
        Sender.make("jobs@example.com"),
      ]),
    ).toBe("in:inbox {from:linkedin.com from:jobs@example.com}");
  });
});
