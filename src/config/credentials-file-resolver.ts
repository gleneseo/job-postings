import { Context, Effect, Layer, Option } from "effect";
import FilePath from "../helpers/file-path.js";
import ConfigFileLocator from "./config-file-locator.js";
import CredentialsFileNotFoundError from "./credentials-file-not-found-error.js";

/**
 * A resolved OAuth2 credentials file: where it is and how that location was determined
 */
interface ResolvedCredentialsFile {
  readonly path: typeof FilePath.Type;
  readonly source: "flag" | "well-known location";
}

/**
 * Resolves the Google OAuth2 credentials file used by the `gmail`
 * Helper
 */
class CredentialsFileResolver extends Context.Service<
  CredentialsFileResolver,
  {
    /**
     * Resolves the OAuth2 credentials file, preferring the explicit path and otherwise
     * using `gleneseo-helpers/gmail.json` in the Config directory
     *
     * @param explicitPath - The OAuth2 credentials file path given by the user, if any
     * @returns An effect that resolves to the OAuth2 credentials file, or fails with
     * {@link CredentialsFileNotFoundError} when no regular file exists at the
     * resolved path
     */
    readonly resolve: (
      explicitPath: Option.Option<typeof FilePath.Type>,
    ) => Effect.Effect<ResolvedCredentialsFile, CredentialsFileNotFoundError>;
  }
>()("@app/CredentialsFileResolver") {
  static readonly layer = Layer.effect(
    CredentialsFileResolver,
    Effect.gen(function* () {
      const locator = yield* ConfigFileLocator;

      const resolve = Effect.fn("credentials-file-resolver.resolve")(function* (
        explicitPath: Option.Option<typeof FilePath.Type>,
      ) {
        const { exists, ...resolved } = yield* locator.locate(
          explicitPath,
          "gmail.json",
        );

        if (!exists) {
          return yield* new CredentialsFileNotFoundError(resolved);
        }
        return resolved;
      });

      return { resolve };
    }),
  );
}

export default CredentialsFileResolver;
