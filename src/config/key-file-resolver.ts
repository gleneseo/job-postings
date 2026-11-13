import { Context, Effect, Layer, Option } from "effect";
import FilePath from "../helpers/file-path.js";
import ConfigFileLocator from "./config-file-locator.js";
import KeyFileNotFoundError from "./key-file-not-found-error.js";

/**
 * A resolved key file: where it is and how that location was determined
 */
interface ResolvedKeyFile {
  readonly path: typeof FilePath.Type;
  readonly source: "flag" | "well-known location";
}

/**
 * Resolves the Google service account key file used by the `job-postings`
 * Helper
 */
class KeyFileResolver extends Context.Service<
  KeyFileResolver,
  {
    /**
     * Resolves the key file, preferring the explicit path and otherwise
     * using `gleneseo-helpers/job-postings.json` in the Config directory
     *
     * @param explicitPath - The key file path given by the user, if any
     * @returns An effect that resolves to the key file, or fails with
     * {@link KeyFileNotFoundError} when no regular file exists at the
     * resolved path
     */
    readonly resolve: (
      explicitPath: Option.Option<typeof FilePath.Type>,
    ) => Effect.Effect<ResolvedKeyFile, KeyFileNotFoundError>;
  }
>()("@app/KeyFileResolver") {
  static readonly layer = Layer.effect(
    KeyFileResolver,
    Effect.gen(function* () {
      const locator = yield* ConfigFileLocator;

      const resolve = Effect.fn("key-file-resolver.resolve")(function* (
        explicitPath: Option.Option<typeof FilePath.Type>,
      ) {
        const { exists, ...resolved } = yield* locator.locate(
          explicitPath,
          "job-postings.json",
        );

        if (!exists) {
          return yield* new KeyFileNotFoundError(resolved);
        }
        return resolved;
      });

      return { resolve };
    }),
  );
}

export default KeyFileResolver;
