import { assert, describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem, Layer, Path, PlatformError } from "effect";
import GmailTools from "../../../src/gmail/gmail-tools.js";
import FilePath from "../../../src/helpers/file-path.js";

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
  });
});
