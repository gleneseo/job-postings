import { authenticate } from "@google-cloud/local-auth";
import {
  Array,
  Console,
  Context,
  Duration,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Predicate,
  Schema,
  Stream,
  String,
} from "effect";
import { type Auth, type gmail_v1, google } from "googleapis";
import { simpleParser, type AddressObject } from "mailparser";
import CredentialsReadError from "./credentials-read-error.js";
import GmailAuthError from "./gmail-auth-error.js";
import GmailFetchError from "./gmail-fetch-error.js";
import GmailListError from "./gmail-list-error.js";
import type Email from "../helpers/email.js";
import orEmpty from "../helpers/or-empty.js";
import orEmptyArray from "../helpers/or-empty-array.js";
import type FilePath from "../helpers/file-path.js";
import RequestLabel from "../helpers/request-label.js";
import tryRequest from "../helpers/try-request.js";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const MAX_RESULTS_PER_PAGE = 500;
const FETCH_CONCURRENCY = 5;
/**
 * How long to wait for the user to finish the browser consent flow. Fixed
 * rather than set by `--timeout`, since it waits on a person, not a server.
 */
const CONSENT_TIMEOUT = Duration.minutes(5);

const ClientSecrets = Schema.Struct({
  client_id: Schema.String,
  client_secret: Schema.String,
  redirect_uris: Schema.optional(Schema.Array(Schema.String)),
});

const CredentialsFile = Schema.Union([
  Schema.Struct({ installed: ClientSecrets }),
  Schema.Struct({ web: ClientSecrets }),
]);

const NullableString = Schema.optionalKey(Schema.NullOr(Schema.String));

/**
 * The cached OAuth token, as written after the browser consent flow
 */
const Token = Schema.Struct({
  access_token: NullableString,
  refresh_token: NullableString,
  expiry_date: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  token_type: NullableString,
  id_token: NullableString,
  scope: Schema.optionalKey(Schema.String),
});

/**
 * The string when it is present and not empty
 */
const nonEmpty = (value: string | null | undefined) =>
  Option.fromNullishOr(value).pipe(Option.filter(String.isNonEmpty));

/**
 * Takes the first address in a parsed `From` or `To` header as an email's
 * sender or recipient
 *
 * @param header - The parsed header, or `none` when the email has none
 * @returns The address's name and email, each an empty string when missing
 */
const firstAddress = (header: Option.Option<AddressObject>) =>
  header.pipe(
    Option.flatMap((h) => Array.head(h.value)),
    Option.match({
      onNone: () => ({ name: "", email: "" }),
      onSome: (address) => ({
        name: orEmpty(address.name),
        email: orEmpty(address.address),
      }),
    }),
  );

/**
 * A collection of tools from Gmail
 */
class GmailTools extends Context.Service<
  GmailTools,
  {
    /**
     * Creates a Gmail auth client from a Google OAuth client file, scoped to
     * read-only access. The OAuth token is cached in `tokenPath`; if there is
     * none, the browser opens for the user to consent, waiting up to 5 minutes,
     * and the token is saved there for later runs.
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
     * @param timeout - Maximum time to wait for each page request
     * @returns An Effect that resolves to the matching message IDs
     */
    readonly listMessageIds: (
      auth: Auth.OAuth2Client,
      query: string,
      timeout: Duration.Duration,
    ) => Effect.Effect<Set<string>, GmailListError>;

    /**
     * Fetches and parses the messages with the given IDs, a few at a time
     *
     * @param auth - Authorized Gmail client
     * @param ids - The IDs of the messages to fetch
     * @param timeout - Maximum time to wait for each fetch request
     * @returns An Effect that resolves to the parsed emails
     */
    readonly fetchEmails: (
      auth: Auth.OAuth2Client,
      ids: readonly string[],
      timeout: Duration.Duration,
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
          const keys = yield* Schema.decodeUnknownEffect(
            Schema.fromJsonString(CredentialsFile),
          )(text);
          return "installed" in keys ? keys.installed : keys.web;
        }).pipe(
          Effect.mapError(
            (cause) =>
              new CredentialsReadError({ path: credentialsPath, cause }),
          ),
          Effect.withSpan("gmail-tools.read-credentials"),
        );

      /**
       * Reads the cached token, or `none` if there is none yet; a token file
       * that is not valid JSON or not shaped like a token fails with a
       * `SchemaError`
       */
      const readToken = (tokenPath: typeof FilePath.Type) =>
        fs.readFileString(tokenPath).pipe(
          Effect.flatMap(
            Schema.decodeUnknownEffect(Schema.fromJsonString(Token)),
          ),
          Effect.map(Option.some),
          Effect.catchReason(
            "PlatformError",
            "NotFound",
            () => Effect.succeedNone,
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
          Option.fromNullishOr(secrets.redirect_uris).pipe(
            Option.flatMap(Array.head),
            Option.getOrUndefined,
          ),
        );

        const token = yield* readToken(tokenPath).pipe(
          Effect.mapError((cause) => new GmailAuthError({ tokenPath, cause })),
        );
        if (Option.isSome(token)) {
          client.setCredentials(token.value);
          return client;
        }

        yield* Console.error(
          `Opening browser to authorize Gmail access (waiting up to ${Duration.format(CONSENT_TIMEOUT)})...`,
        );
        const { credentials } = yield* tryRequest({
          try: () =>
            authenticate({ keyfilePath: credentialsPath, scopes: SCOPES }),
          label: RequestLabel.make("Gmail consent"),
          toError: (cause) => new GmailAuthError({ tokenPath, cause }),
          timeout: CONSENT_TIMEOUT,
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
            Effect.mapError(
              (cause) => new GmailAuthError({ tokenPath, cause }),
            ),
          );
        return client;
      });

      const listMessageIds = Effect.fn("gmail-tools.list-message-ids")(
        function* (
          auth: Auth.OAuth2Client,
          query: string,
          timeout: Duration.Duration,
        ) {
          const gmail = google.gmail({ version: "v1", auth });
          const listPage = (pageToken: Option.Option<string>) =>
            tryRequest({
              try: () =>
                gmail.users.messages.list({
                  userId: "me",
                  q: query,
                  maxResults: MAX_RESULTS_PER_PAGE,
                  ...Option.match(pageToken, {
                    onNone: () => ({}),
                    onSome: (token) => ({ pageToken: token }),
                  }),
                }),
              label: RequestLabel.make("Message list"),
              toError: (cause) => new GmailListError({ cause }),
              timeout,
            }).pipe(
              Effect.map(({ data }) => {
                const ids = Array.getSomes(
                  Array.map(orEmptyArray(data.messages), (message) =>
                    nonEmpty(message.id),
                  ),
                );
                // `Stream.paginate` ends on `None`; `Some(Some(token))`
                // requests the next page
                const next = nonEmpty(data.nextPageToken).pipe(
                  Option.map(Option.some),
                );
                return [ids, next] as const;
              }),
            );
          const ids = yield* Stream.paginate(
            Option.none<string>(),
            listPage,
          ).pipe(Stream.runCollect);
          return new Set(ids);
        },
      );

      const fetchEmail = (
        gmail: gmail_v1.Gmail,
        id: string,
        timeout: Duration.Duration,
      ) => {
        const fetchError = (cause: unknown) =>
          new GmailFetchError({ messageId: id, cause });
        return tryRequest({
          try: () =>
            gmail.users.messages.get({ userId: "me", id, format: "raw" }),
          label: RequestLabel.make("Message fetch"),
          toError: fetchError,
          timeout,
        }).pipe(
          Effect.flatMap(({ data }) =>
            Effect.tryPromise({
              try: () =>
                simpleParser(Buffer.from(orEmpty(data.raw), "base64url")),
              catch: fetchError,
            }).pipe(
              Effect.flatMap((parsed) =>
                Effect.try({
                  try: () => ({
                    id,
                    from: firstAddress(Option.fromNullishOr(parsed.from)),
                    to: firstAddress(
                      Option.fromNullishOr(parsed.to).pipe(
                        Option.flatMap((to) => Array.head(Array.ensure(to))),
                      ),
                    ),
                    subject: orEmpty(parsed.subject),
                    textBody: orEmpty(parsed.text).replace(/\r\n/g, "\n"),
                    htmlBody: Option.liftPredicate(
                      parsed.html,
                      Predicate.isString,
                    )
                      .pipe(Option.getOrElse(() => ""))
                      .replace(/\r\n/g, "\n"),
                    // Throws a RangeError for an unreadable `internalDate`
                    receivedAt: new Date(
                      Number(data.internalDate),
                    ).toISOString(),
                  }),
                  catch: fetchError,
                }),
              ),
            ),
          ),
          Effect.withSpan("gmail-tools.fetch-email"),
        );
      };

      const fetchEmails = Effect.fn("gmail-tools.fetch-emails")(function* (
        auth: Auth.OAuth2Client,
        ids: readonly string[],
        timeout: Duration.Duration,
      ) {
        const gmail = google.gmail({ version: "v1", auth });
        return yield* Effect.forEach(
          ids,
          (id) => fetchEmail(gmail, id, timeout),
          {
            concurrency: FETCH_CONCURRENCY,
          },
        );
      });

      return GmailTools.of({ authorize, listMessageIds, fetchEmails });
    }),
  );
}

export default GmailTools;
