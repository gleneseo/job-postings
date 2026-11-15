import { assert, describe, expect, it } from "@effect/vitest";
// `vi.mock` is only hoisted above the imports when `vi` comes from `vitest`
// itself, not from its `@effect/vitest` re-export
import { vi } from "vitest";
import {
  Array,
  Cause,
  Duration,
  Effect,
  Fiber,
  FileSystem,
  Function,
  Layer,
  Match,
  Option,
  Path,
  PlatformError,
  Record,
} from "effect";
import { TestClock, TestConsole } from "effect/testing";
import { type Auth, google } from "googleapis";
import GmailTools from "../../../src/gmail/gmail-tools.js";
import FilePath from "../../../src/helpers/file-path.js";

// The browser consent flow never answers, as when the user walks away from
// it; tests that reach it rely on its timeout
vi.mock("@google-cloud/local-auth", () => ({
  authenticate: vi.fn(() => new Promise<never>(() => undefined)),
}));

const credentialsPath = FilePath.make("/config/gmail.json");
const tokenPath = FilePath.make("/config/gmail-token.json");
const credentials = JSON.stringify({
  installed: { client_id: "id", client_secret: "secret" },
});

/**
 * Authorizes against a file system holding only the given files, so no
 * network call or browser consent flow happens as long as a token is cached
 */
const authorize = (files: Record<string, string>) =>
  Effect.gen(function* () {
    const gmailTools = yield* GmailTools;
    return yield* gmailTools.authorize(credentialsPath, tokenPath);
  }).pipe(
    Effect.provide(
      GmailTools.layer.pipe(
        Layer.provide(
          FileSystem.layerNoop({
            readFileString: (path) =>
              path in files
                ? Effect.succeed(files[path] ?? "")
                : Effect.fail(
                    PlatformError.systemError({
                      _tag: "NotFound",
                      module: "FileSystem",
                      method: "readFileString",
                      pathOrDescriptor: path,
                    }),
                  ),
          }),
        ),
        Layer.provide(Path.layer),
      ),
    ),
  );

/**
 * A Gmail API response, an error to reject the request with, `pending` for a
 * request that never answers, or `later` for a response the test hands over
 * when it chooses
 */
type Reply =
  | { readonly data: unknown }
  | { readonly error: Error }
  | { readonly pending: true }
  | { readonly later: Promise<unknown> };

/**
 * An OAuth2 client whose requests never reach the network: googleapis hands
 * each HTTP request to the client's `request`, which answers it from
 * `respond`
 */
const fakeAuth = (
  respond: (url: string, params: Record<string, unknown>) => Reply,
): Auth.OAuth2Client => {
  const auth = new google.auth.OAuth2();
  auth.request = ((opts: { url: string; params?: Record<string, unknown> }) => {
    const reply = respond(
      opts.url,
      Option.fromNullishOr(opts.params).pipe(Option.getOrElse(() => ({}))),
    );
    return Match.value(reply).pipe(
      Match.when(
        { pending: true },
        () => new Promise<never>(Function.constVoid),
      ),
      Match.when({ later: Match.defined }, ({ later }) =>
        later.then((data) => ({ data, headers: new Headers() })),
      ),
      Match.when({ error: Match.defined }, ({ error }) =>
        Promise.reject(error),
      ),
      Match.when({ data: Match.any }, ({ data }) =>
        Promise.resolve({ data, headers: new Headers() }),
      ),
      Match.exhaustive,
    );
  }) as typeof auth.request;
  return auth;
};

/**
 * Encodes an RFC 822 message as Gmail's `raw` format does
 */
const raw = (lines: readonly string[]) =>
  Buffer.from(lines.join("\r\n")).toString("base64url");

const receivedAt = "2026-03-01T12:00:00.000Z";

/**
 * Answers a `messages.get` request for each of the given raw messages, all
 * received at `internalDate` (by default {@link receivedAt}, in epoch
 * milliseconds)
 */
const messages =
  (
    byId: Record<string, readonly string[]>,
    internalDate = String(Date.parse(receivedAt)),
  ) =>
  (url: string): Reply =>
    Array.last(url.split("/")).pipe(
      Option.flatMap((id) =>
        Record.get(byId, id).pipe(Option.map((lines) => ({ id, lines }))),
      ),
      Option.match({
        onNone: () => ({ error: new Error(`No message at ${url}`) }),
        onSome: ({ id, lines }) => ({
          data: {
            id,
            raw: raw(lines),
            internalDate,
          },
        }),
      }),
    );

const timeout = Duration.seconds(10);

const NoFileSystemLayer = GmailTools.layer.pipe(
  Layer.provide(FileSystem.layerNoop({})),
  Layer.provide(Path.layer),
);

const listMessageIds = (auth: Auth.OAuth2Client) =>
  Effect.gen(function* () {
    const gmailTools = yield* GmailTools;
    return yield* gmailTools.listMessageIds(auth, "in:inbox", timeout);
  }).pipe(Effect.provide(NoFileSystemLayer));

const fetchEmails = (auth: Auth.OAuth2Client, ids: readonly string[]) =>
  Effect.gen(function* () {
    const gmailTools = yield* GmailTools;
    return yield* gmailTools.fetchEmails(auth, ids, timeout);
  }).pipe(Effect.provide(NoFileSystemLayer));

describe("GmailTools", () => {
  describe("authorize", () => {
    it.effect("should use the cached token when it is valid", () =>
      Effect.gen(function* () {
        const client = yield* authorize({
          [credentialsPath]: credentials,
          [tokenPath]: JSON.stringify({
            access_token: "access",
            refresh_token: "refresh",
            expiry_date: 1,
          }),
        });

        assert.deepStrictEqual(client.credentials, {
          access_token: "access",
          refresh_token: "refresh",
          expiry_date: 1,
        });
      }),
    );

    it.effect(
      "should fail with a GmailAuthError naming the token file when the token is not valid JSON",
      () =>
        Effect.gen(function* () {
          const failure = yield* authorize({
            [credentialsPath]: credentials,
            [tokenPath]: "not json",
          }).pipe(Effect.flip);

          assert.strictEqual(failure._tag, "GmailAuthError");
          if (failure._tag === "GmailAuthError") {
            assert.strictEqual(failure.tokenPath, tokenPath);
            expect(failure.cause).toBeInstanceOf(Error);
          }
        }),
    );

    it.effect(
      "should fail with a GmailAuthError when the token is not shaped like a token",
      () =>
        Effect.gen(function* () {
          const failure = yield* authorize({
            [credentialsPath]: credentials,
            [tokenPath]: JSON.stringify({ expiry_date: "soon" }),
          }).pipe(Effect.flip);

          assert.strictEqual(failure._tag, "GmailAuthError");
        }),
    );

    it.effect(
      "should fail with a CredentialsReadError when the credentials file is not valid JSON",
      () =>
        Effect.gen(function* () {
          const failure = yield* authorize({
            [credentialsPath]: "not json",
          }).pipe(Effect.flip);

          assert.strictEqual(failure._tag, "CredentialsReadError");
        }),
    );

    it.effect(
      "should fail with a CredentialsReadError when the credentials file has neither an installed nor a web client",
      () =>
        Effect.gen(function* () {
          const failure = yield* authorize({
            [credentialsPath]: JSON.stringify({}),
          }).pipe(Effect.flip);

          assert.strictEqual(failure._tag, "CredentialsReadError");
        }),
    );

    it.effect(
      "should fail with a GmailAuthError wrapping a timeout when browser consent takes longer than 5 minutes",
      () =>
        Effect.gen(function* () {
          const fiber = yield* authorize({
            [credentialsPath]: credentials,
          }).pipe(Effect.flip, Effect.forkChild);
          yield* TestClock.adjust(Duration.seconds(299));
          assert.isUndefined(fiber.pollUnsafe());

          yield* TestClock.adjust(Duration.seconds(1));
          const failure = yield* Fiber.join(fiber);

          assert.strictEqual(failure._tag, "GmailAuthError");
          if (failure._tag === "GmailAuthError") {
            assert.strictEqual(failure.tokenPath, tokenPath);
            assert.instanceOf(failure.cause, Cause.TimeoutError);
            assert.strictEqual(
              failure.cause.message,
              "Gmail consent timed out after 5m",
            );
          }
        }),
    );

    it.effect(
      "should tell the user how long browser consent may take before opening the browser",
      () =>
        Effect.gen(function* () {
          yield* authorize({ [credentialsPath]: credentials }).pipe(
            Effect.forkChild,
          );
          yield* TestClock.adjust(Duration.seconds(1));

          assert.deepStrictEqual(yield* TestConsole.errorLines, [
            "Opening browser to authorize Gmail access (waiting up to 5m)...",
          ]);
        }),
    );
  });

  describe("listMessageIds", () => {
    it.effect("should collect the message IDs from every page of results", () =>
      Effect.gen(function* () {
        const auth = fakeAuth((_, params) =>
          params["pageToken"] === undefined
            ? {
                data: {
                  messages: [{ id: "a" }, { id: "b" }],
                  nextPageToken: "page-2",
                },
              }
            : params["pageToken"] === "page-2"
              ? { data: { messages: [{ id: "c" }] } }
              : { error: new Error("Unexpected page") },
        );

        const ids = yield* listMessageIds(auth);

        expect([...ids]).toEqual(["a", "b", "c"]);
      }),
    );

    it.effect("should skip messages that have no ID", () =>
      Effect.gen(function* () {
        const auth = fakeAuth(() => ({
          data: { messages: [{ id: "a" }, {}] },
        }));

        const ids = yield* listMessageIds(auth);

        expect([...ids]).toEqual(["a"]);
      }),
    );

    it.effect("should return no IDs when no message matches", () =>
      Effect.gen(function* () {
        const auth = fakeAuth(() => ({ data: { resultSizeEstimate: 0 } }));

        const ids = yield* listMessageIds(auth);

        expect(ids.size).toBe(0);
      }),
    );

    it.effect("should stop paging at an empty next page token", () =>
      Effect.gen(function* () {
        const auth = fakeAuth((_, params) =>
          params["pageToken"] === undefined
            ? { data: { messages: [{ id: "a" }], nextPageToken: "" } }
            : { error: new Error("Unexpected page") },
        );

        const ids = yield* listMessageIds(auth);

        expect([...ids]).toEqual(["a"]);
      }),
    );

    it.effect("should fail with a GmailListError when listing fails", () =>
      Effect.gen(function* () {
        const auth = fakeAuth(() => ({ error: new Error("Quota exceeded") }));

        const failure = yield* listMessageIds(auth).pipe(Effect.flip);

        assert.strictEqual(failure._tag, "GmailListError");
      }),
    );

    it.effect(
      "should fail with a GmailListError wrapping a timeout when a page outlasts the timeout",
      () =>
        Effect.gen(function* () {
          const auth = fakeAuth(() => ({ pending: true }));

          const fiber = yield* listMessageIds(auth).pipe(
            Effect.flip,
            Effect.forkChild,
          );
          yield* TestClock.adjust(Duration.seconds(11));
          const failure = yield* Fiber.join(fiber);

          assert.strictEqual(failure._tag, "GmailListError");
          assert.instanceOf(failure.cause, Cause.TimeoutError);
          assert.strictEqual(
            failure.cause.message,
            "Message list timed out after 10s",
          );
        }),
    );

    it.effect(
      "should give each page its own timeout rather than one for the whole listing",
      () =>
        Effect.gen(function* () {
          const page1 = Promise.withResolvers<unknown>();
          const page2 = Promise.withResolvers<unknown>();
          const auth = fakeAuth((_, params) =>
            params["pageToken"] === undefined
              ? { later: page1.promise }
              : { later: page2.promise },
          );

          const fiber = yield* listMessageIds(auth).pipe(Effect.forkChild);
          yield* TestClock.adjust(Duration.seconds(6));
          page1.resolve({ messages: [{ id: "a" }], nextPageToken: "page-2" });
          yield* Effect.promise(() => page1.promise);
          yield* TestClock.adjust(Duration.seconds(6));
          page2.resolve({ messages: [{ id: "b" }] });
          const ids = yield* Fiber.join(fiber);

          expect([...ids]).toEqual(["a", "b"]);
        }),
    );
  });

  describe("fetchEmails", () => {
    it.effect(
      "should parse the sender, recipient, subject, body and receive date",
      () =>
        Effect.gen(function* () {
          const auth = fakeAuth(
            messages({
              a: [
                "From: Ada Lovelace <ada@example.com>",
                "To: Charles Babbage <charles@example.com>",
                "Subject: Engines",
                "",
                "First line",
                "Second line",
              ],
            }),
          );

          const emails = yield* fetchEmails(auth, ["a"]);

          expect(emails).toEqual([
            {
              id: "a",
              from: { name: "Ada Lovelace", email: "ada@example.com" },
              to: { name: "Charles Babbage", email: "charles@example.com" },
              subject: "Engines",
              textBody: "First line\nSecond line",
              htmlBody: "",
              receivedAt,
            },
          ]);
        }),
    );

    it.effect(
      "should use an empty recipient name and address when the email has no To",
      () =>
        Effect.gen(function* () {
          const auth = fakeAuth(
            messages({
              a: ["From: ada@example.com", "Subject: Engines", "", "Body"],
            }),
          );

          const [email] = yield* fetchEmails(auth, ["a"]);

          expect(email?.to).toEqual({ name: "", email: "" });
        }),
    );

    it.effect(
      "should use the first recipient when the email has several To headers",
      () =>
        Effect.gen(function* () {
          const auth = fakeAuth(
            messages({
              a: [
                "From: ada@example.com",
                "To: Charles <charles@example.com>",
                "To: Mary <mary@example.com>",
                "Subject: Engines",
                "",
                "Body",
              ],
            }),
          );

          const [email] = yield* fetchEmails(auth, ["a"]);

          expect(email?.to).toEqual({
            name: "Charles",
            email: "charles@example.com",
          });
        }),
    );

    it.effect(
      "should use an empty subject and bodies when the email has none",
      () =>
        Effect.gen(function* () {
          const auth = fakeAuth(
            messages({ a: ["From: ada@example.com", "", ""] }),
          );

          const [email] = yield* fetchEmails(auth, ["a"]);

          expect(email).toMatchObject({
            subject: "",
            textBody: "",
            htmlBody: "",
          });
        }),
    );

    it.effect(
      "should keep the HTML body of an HTML-only email with Unix line endings",
      () =>
        Effect.gen(function* () {
          const auth = fakeAuth(
            messages({
              a: [
                "From: ada@example.com",
                "Subject: Engines",
                "Content-Type: text/html; charset=utf-8",
                "",
                "<p>First</p>",
                "<p>Second</p>",
              ],
            }),
          );

          const [email] = yield* fetchEmails(auth, ["a"]);

          expect(email?.htmlBody).toBe("<p>First</p>\n<p>Second</p>");
        }),
    );

    it.effect(
      "should fail with a GmailFetchError naming the message when fetching it fails",
      () =>
        Effect.gen(function* () {
          const auth = fakeAuth(messages({}));

          const failure = yield* fetchEmails(auth, ["missing"]).pipe(
            Effect.flip,
          );

          assert.strictEqual(failure._tag, "GmailFetchError");
          assert.strictEqual(failure.messageId, "missing");
        }),
    );

    it.effect(
      "should fail with a GmailFetchError naming the message when its receive date can't be read",
      () =>
        Effect.gen(function* () {
          const auth = fakeAuth(
            messages({ a: ["From: ada@example.com", "", "Body"] }, "soon"),
          );

          const failure = yield* fetchEmails(auth, ["a"]).pipe(Effect.flip);

          assert.strictEqual(failure._tag, "GmailFetchError");
          assert.strictEqual(failure.messageId, "a");
        }),
    );

    it.effect(
      "should fail with a GmailFetchError naming the message wrapping a timeout when a fetch outlasts the timeout",
      () =>
        Effect.gen(function* () {
          const auth = fakeAuth(() => ({ pending: true }));

          const fiber = yield* fetchEmails(auth, ["a"]).pipe(
            Effect.flip,
            Effect.forkChild,
          );
          yield* TestClock.adjust(Duration.seconds(11));
          const failure = yield* Fiber.join(fiber);

          assert.strictEqual(failure._tag, "GmailFetchError");
          assert.strictEqual(failure.messageId, "a");
          assert.instanceOf(failure.cause, Cause.TimeoutError);
          assert.strictEqual(
            failure.cause.message,
            "Message fetch timed out after 10s",
          );
        }),
    );
  });
});
