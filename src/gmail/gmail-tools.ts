import { authenticate } from "@google-cloud/local-auth";
import {
  Console,
  Context,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Schema,
} from "effect";
import { type Auth, type gmail_v1, google } from "googleapis";
import { simpleParser, type AddressObject } from "mailparser";
import CredentialsReadError from "./credentials-read-error.js";
import GmailAuthError from "./gmail-auth-error.js";
import GmailFetchError from "./gmail-fetch-error.js";
import GmailListError from "./gmail-list-error.js";
import type Email from "../helpers/email.js";
import type FilePath from "../helpers/file-path.js";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const MAX_RESULTS_PER_PAGE = 500;
const FETCH_CONCURRENCY = 5;

const ClientSecrets = Schema.Struct({
  client_id: Schema.String,
  client_secret: Schema.String,
  redirect_uris: Schema.optional(Schema.Array(Schema.String)),
});

const CredentialsFile = Schema.Struct({
  installed: Schema.optional(ClientSecrets),
  web: Schema.optional(ClientSecrets),
});

const person = (list: AddressObject | undefined) => {
  const first = list?.value[0];
  return { name: first?.name ?? "", email: first?.address ?? "" };
};

/**
 * A collection of tools from Gmail
 */
class GmailTools extends Context.Service<
  GmailTools,
  {
    /**
     * Creates a Gmail auth client from a Google OAuth client file, scoped to
     * read-only access. The OAuth token is cached in `tokenPath`; if there is
     * none, the browser opens for the user to consent and the token is saved
     * there for later runs.
     *
     * @param credentialsPath - Path to the Google OAuth client JSON file
     * @param tokenPath - Path of the cached OAuth token
     * @returns An Effect that resolves to the authorized client
     */
    readonly authorize: (
      credentialsPath: typeof FilePath.Type,
      tokenPath: typeof FilePath.Type,
    ) => Effect.Effect<
      Auth.OAuth2Client,
      CredentialsReadError | GmailAuthError
    >;

    /**
     * Lists the IDs of every message in Gmail matching a search query,
     * following the pages of results
     *
     * @param auth - Authorized Gmail client
     * @param query - The Gmail search query
     * @returns An Effect that resolves to the matching message IDs
     */
    readonly listMessageIds: (
      auth: Auth.OAuth2Client,
      query: string,
    ) => Effect.Effect<Set<string>, GmailListError>;

    /**
     * Fetches and parses the messages with the given IDs, a few at a time
     *
     * @param auth - Authorized Gmail client
     * @param ids - The IDs of the messages to fetch
     * @returns An Effect that resolves to the parsed emails
     */
    readonly fetchEmails: (
      auth: Auth.OAuth2Client,
      ids: readonly string[],
    ) => Effect.Effect<(typeof Email.Type)[], GmailFetchError>;
  }
>()("@app/GmailTools") {
  static readonly layer = Layer.effect(
    GmailTools,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      const readCredentials = (credentialsPath: typeof FilePath.Type) =>
        Effect.gen(function* () {
          const text = yield* fs.readFileString(credentialsPath);
          const json: unknown = yield* Effect.try(
            () => JSON.parse(text) as unknown,
          );
          const keys = yield* Schema.decodeUnknownEffect(CredentialsFile)(json);
          const secrets = keys.installed ?? keys.web;
          if (!secrets) {
            return yield* Effect.fail(
              "expected an `installed` or `web` OAuth client",
            );
          }
          return secrets;
        }).pipe(
          Effect.mapError(
            (cause) =>
              new CredentialsReadError({ path: credentialsPath, cause }),
          ),
          Effect.withSpan("gmail-tools.read-credentials"),
        );

      /** Reads the cached token, or `none` if there is none yet */
      const readToken = (tokenPath: typeof FilePath.Type) =>
        fs.readFileString(tokenPath).pipe(
          Effect.map((text) =>
            Option.some(JSON.parse(text) as Auth.Credentials),
          ),
          Effect.catchIf(
            (error) => error.reason._tag === "NotFound",
            () => Effect.succeed(Option.none<Auth.Credentials>()),
          ),
        );

      const authorize = Effect.fn("gmail-tools.authorize")(function* (
        credentialsPath: typeof FilePath.Type,
        tokenPath: typeof FilePath.Type,
      ) {
        const secrets = yield* readCredentials(credentialsPath);
        const client = new google.auth.OAuth2(
          secrets.client_id,
          secrets.client_secret,
          secrets.redirect_uris?.[0],
        );

        const token = yield* readToken(tokenPath).pipe(
          Effect.mapError((cause) => new GmailAuthError({ cause })),
        );
        if (Option.isSome(token)) {
          client.setCredentials(token.value);
          return client;
        }

        yield* Console.error("Opening browser to authorize Gmail access...");
        const { credentials } = yield* Effect.tryPromise({
          try: () =>
            authenticate({ keyfilePath: credentialsPath, scopes: SCOPES }),
          catch: (cause) => new GmailAuthError({ cause }),
        });
        // `local-auth` bundles a different google-auth-library version than
        // `googleapis`, so its client is structurally incompatible with
        // `google.gmail()`. The credentials are plain data, so transfer them
        // to a native client instead.
        client.setCredentials(credentials);
        yield* fs
          .makeDirectory(path.dirname(tokenPath), { recursive: true })
          .pipe(
            Effect.andThen(
              fs.writeFileString(tokenPath, JSON.stringify(credentials), {
                mode: 0o600,
              }),
            ),
            Effect.mapError((cause) => new GmailAuthError({ cause })),
          );
        return client;
      });

      const listMessageIds = Effect.fn("gmail-tools.list-message-ids")(
        function* (auth: Auth.OAuth2Client, query: string) {
          const gmail = google.gmail({ version: "v1", auth });
          const ids = new Set<string>();
          let pageToken: string | undefined;
          do {
            const page: gmail_v1.Schema$ListMessagesResponse =
              yield* Effect.tryPromise({
                try: () =>
                  gmail.users.messages
                    .list({
                      userId: "me",
                      q: query,
                      maxResults: MAX_RESULTS_PER_PAGE,
                      ...(pageToken === undefined ? {} : { pageToken }),
                    })
                    .then((response) => response.data),
                catch: (cause) => new GmailListError({ cause }),
              });
            for (const message of page.messages ?? []) {
              if (message.id) {
                ids.add(message.id);
              }
            }
            pageToken = page.nextPageToken ?? undefined;
          } while (pageToken);
          return ids;
        },
      );

      const fetchEmail = (gmail: gmail_v1.Gmail, id: string) =>
        Effect.tryPromise({
          try: async () => {
            const { data } = await gmail.users.messages.get({
              userId: "me",
              id,
              format: "raw",
            });
            const parsed = await simpleParser(
              Buffer.from(data.raw ?? "", "base64url"),
            );
            return {
              id,
              from: person(parsed.from),
              to: person(Array.isArray(parsed.to) ? parsed.to[0] : parsed.to),
              subject: parsed.subject ?? "",
              textBody: (parsed.text ?? "").replace(/\r\n/g, "\n"),
              htmlBody: (typeof parsed.html === "string"
                ? parsed.html
                : ""
              ).replace(/\r\n/g, "\n"),
              receivedAt: new Date(Number(data.internalDate)).toISOString(),
            };
          },
          catch: (cause) => new GmailFetchError({ messageId: id, cause }),
        }).pipe(Effect.withSpan("gmail-tools.fetch-email"));

      const fetchEmails = Effect.fn("gmail-tools.fetch-emails")(function* (
        auth: Auth.OAuth2Client,
        ids: readonly string[],
      ) {
        const gmail = google.gmail({ version: "v1", auth });
        return yield* Effect.forEach(ids, (id) => fetchEmail(gmail, id), {
          concurrency: FETCH_CONCURRENCY,
        });
      });

      return GmailTools.of({ authorize, listMessageIds, fetchEmails });
    }),
  );
}

export default GmailTools;
