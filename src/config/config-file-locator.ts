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

/**
 * A located config file: where it is, how that location was determined, and
 * whether a regular file exists there
 */
interface LocatedConfigFile {
  readonly path: typeof FilePath.Type;
  readonly source: "flag" | "well-known location";
  readonly exists: boolean;
}

/**
 * Locates the files that Helpers keep in the Config directory
 */
class ConfigFileLocator extends Context.Service<
  ConfigFileLocator,
  {
    /**
     * Locates a config file, preferring the explicit path and otherwise using
     * `gleneseo-helpers/<fileName>` under `XDG_CONFIG_HOME` (when it is set to
     * a non-empty, absolute path) or `~/.config`
     *
     * @param explicitPath - The file path given by the user, if any
     * @param fileName - The name of the file in the Config directory
     * @returns An effect that resolves to the located file, with `exists`
     * telling whether a regular file is present at its path
     */
    readonly locate: (
      explicitPath: Option.Option<typeof FilePath.Type>,
      fileName: string,
    ) => Effect.Effect<LocatedConfigFile>;
  }
>()("@app/ConfigFileLocator") {
  /**
   * Builds a layer that resolves `~` with the given home directory lookup
   *
   * @param homeDirectory - Returns the current user's home directory
   */
  static readonly layerWith = (homeDirectory: () => string) =>
    Layer.effect(
      ConfigFileLocator,
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        const wellKnownPath = Effect.fn("config-file-locator.well-known-path")(
          function* (fileName: string) {
            const xdgConfigHome = yield* Config.String("XDG_CONFIG_HOME").pipe(
              Config.option,
              Effect.orDie,
            );
            const configHome = xdgConfigHome.pipe(
              Option.filter((x) => x !== "" && path.isAbsolute(x)),
              Option.getOrElse(() => path.join(homeDirectory(), ".config")),
            );
            return FilePath.make(
              path.join(configHome, "gleneseo-helpers", fileName),
            );
          },
        );

        const isRegularFile = (filePath: typeof FilePath.Type) =>
          fileSystem.stat(filePath).pipe(
            Effect.map((info) => info.type === "File"),
            Effect.orElseSucceed(() => false),
          );

        const locate = Effect.fn("config-file-locator.locate")(function* (
          explicitPath: Option.Option<typeof FilePath.Type>,
          fileName: string,
        ) {
          const located = Option.isSome(explicitPath)
            ? { path: explicitPath.value, source: "flag" as const }
            : {
                path: yield* wellKnownPath(fileName),
                source: "well-known location" as const,
              };

          return { ...located, exists: yield* isRegularFile(located.path) };
        });

        return { locate };
      }),
    );

  static readonly layer = ConfigFileLocator.layerWith(os.homedir);
}

export default ConfigFileLocator;
