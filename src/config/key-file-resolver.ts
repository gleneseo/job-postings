import os from "node:os";
import {
  Config,
  Context,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
} from "effect";
import FilePath from "../helpers/file-path.js";
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
     * using `gleneseo-helpers/job-postings.json` under `XDG_CONFIG_HOME`
     * (when it is set to a non-empty, absolute path) or `~/.config`
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
  /**
   * Builds a layer that resolves `~` with the given home directory lookup
   *
   * @param homeDirectory - Returns the current user's home directory
   */
  static readonly layerWith = (homeDirectory: () => string) =>
    Layer.effect(
      KeyFileResolver,
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        const wellKnownPath = Effect.gen(function* () {
          const xdgConfigHome = yield* Config.String("XDG_CONFIG_HOME").pipe(
            Config.option,
            Effect.orDie,
          );
          const configHome = xdgConfigHome.pipe(
            Option.filter((x) => x !== "" && path.isAbsolute(x)),
            Option.getOrElse(() => path.join(homeDirectory(), ".config")),
          );
          return FilePath.make(
            path.join(configHome, "gleneseo-helpers", "job-postings.json"),
          );
        });

        const isRegularFile = (keyFilePath: typeof FilePath.Type) =>
          fileSystem.stat(keyFilePath).pipe(
            Effect.map((info) => info.type === "File"),
            Effect.orElseSucceed(() => false),
          );

        const resolve = (explicitPath: Option.Option<typeof FilePath.Type>) =>
          Effect.gen(function* () {
            const resolved: ResolvedKeyFile = Option.isSome(explicitPath)
              ? { path: explicitPath.value, source: "flag" }
              : { path: yield* wellKnownPath, source: "well-known location" };

            if (!(yield* isRegularFile(resolved.path))) {
              return yield* new KeyFileNotFoundError(resolved);
            }
            return resolved;
          }).pipe(Effect.withSpan("key-file-resolver.resolve"));

        return { resolve };
      }),
    );

  static readonly layer = KeyFileResolver.layerWith(os.homedir);
}

export default KeyFileResolver;
