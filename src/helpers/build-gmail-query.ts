import { Array } from "effect";
import type Sender from "./sender.js";

/**
 * Builds the Gmail search query for the inbox, restricted to messages from
 * any of the given senders. With several senders, Gmail's `{}` operator
 * matches a message from any of them.
 *
 * @param senders - Email addresses or domains to search for; empty to match
 * every message in the inbox
 * @returns The Gmail search query
 */
const buildGmailQuery = (senders: readonly (typeof Sender.Type)[]) => {
  const froms = senders.map((sender) => `from:${sender}`);
  const filter = Array.matchLeft(froms, {
    onEmpty: () => "",
    onNonEmpty: (first, rest) =>
      Array.isArrayNonEmpty(rest) ? `{${froms.join(" ")}}` : first,
  });
  return `in:inbox ${filter}`.trim();
};

export default buildGmailQuery;
