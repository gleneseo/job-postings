import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { TestConsole } from "effect/testing";
import banner from "../../../../src/cli/banner.js";
import handleGmailCommand from "../../../../src/cli/command-handlers/handle-gmail-command.js";
import CredentialsFileResolver from "../../../../src/config/credentials-file-resolver.js";
import CredentialsFileNotFoundError from "../../../../src/config/credentials-file-not-found-error.js";
import FilePath from "../../../../src/helpers/file-path.js";

const placeholder = "The gmail helper is not implemented yet.";
const credentialsFilePath = FilePath.make("/gmail.json");

const resolverLayer = (
  resolve: (typeof CredentialsFileResolver.Service)["resolve"] = (explicit) =>
    Effect.succeed({
      path: Option.getOrElse(explicit, () => credentialsFilePath),
      source: Option.isSome(explicit)
        ? ("flag" as const)
        : ("well-known location" as const),
    }),
) => Layer.succeed(CredentialsFileResolver, { resolve });

const withTTY = <A, E, R>(isTTY: boolean, effect: Effect.Effect<A, E, R>) =>
  Effect.acquireUseRelease(
    Effect.sync(() => {
      const original = process.stdout.isTTY;
      process.stdout.isTTY = isTTY;
      return original;
    }),
    () => effect,
    (original) =>
      Effect.sync(() => {
        process.stdout.isTTY = original;
      }),
  );

describe("handleGmailCommand", () => {
  it.effect(
    "should print the banner, the resolved credentials file, and the placeholder message when not quiet on an interactive terminal",
    () =>
      Effect.gen(function* () {
        yield* withTTY(
          true,
          handleGmailCommand(Option.none(), false).pipe(
            Effect.provide(resolverLayer()),
          ),
        );

        assert.deepStrictEqual(yield* TestConsole.logLines, [banner]);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          "Using OAuth2 credentials file [/gmail.json] (well-known location).",
          placeholder,
        ]);
      }),
  );

  it.effect("should only print the placeholder message when quiet", () =>
    Effect.gen(function* () {
      yield* withTTY(
        true,
        handleGmailCommand(Option.none(), true).pipe(
          Effect.provide(resolverLayer()),
        ),
      );

      assert.deepStrictEqual(yield* TestConsole.logLines, []);
      assert.deepStrictEqual(yield* TestConsole.errorLines, [placeholder]);
    }),
  );

  it.effect("should pass the explicit path to the resolver", () =>
    Effect.gen(function* () {
      yield* withTTY(
        true,
        handleGmailCommand(Option.some(FilePath.make("/c.json")), false).pipe(
          Effect.provide(resolverLayer()),
        ),
      );

      assert.deepStrictEqual(yield* TestConsole.errorLines, [
        "Using OAuth2 credentials file [/c.json] (flag).",
        placeholder,
      ]);
    }),
  );

  it.effect(
    "should print an error and fail when the credentials file is not found",
    () =>
      Effect.gen(function* () {
        const notFound = new CredentialsFileNotFoundError({
          path: "/gmail.json",
          source: "well-known location",
        });

        const error = yield* withTTY(
          true,
          handleGmailCommand(Option.none(), true).pipe(
            Effect.provide(resolverLayer(() => Effect.fail(notFound))),
          ),
        ).pipe(Effect.flip);

        assert.strictEqual(error, notFound);
        assert.deepStrictEqual(yield* TestConsole.errorLines, [
          "❌ Could not find OAuth2 credentials file [/gmail.json] (well-known location). Make sure the file exists.",
        ]);
      }),
  );
});
