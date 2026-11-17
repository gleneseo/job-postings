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
interface LocatedFile {
  readonly path: typeof FilePath.Type;
  readonly source: "flag" | "well-known location";
  readonly exists: boolean;
}

/**
 * The well-known directories under which Helpers keep their files: the
 * Config directory for configuration, the Data directory for generated data
 */
type WellKnownDirectory = "config" | "data";

/**
 * How each well-known directory is found: the environment variable that may
 * point at its home, and the home it falls back to, relative to the user's
 * home directory
 */
const wellKnownHomes = {
  config: { variable: "XDG_CONFIG_HOME", fallback: [".config"] },
  data: { variable: "XDG_DATA_HOME", fallback: [".local", "share"] },
} as const satisfies Record<
  WellKnownDirectory,
  { readonly variable: string; readonly fallback: readonly string[] }
>;

/**
 * Locates the files that Helpers keep in the Config and Data directories
 */
class WellKnownFileLocator extends Context.Service<
  WellKnownFileLocator,
  {
    /**
     * Locates a file, preferring the explicit path and otherwise using
     * `gleneseo-helpers/<fileName>` under the home of the given directory:
     * `XDG_CONFIG_HOME` or `~/.config` for config, `XDG_DATA_HOME` or
     * `~/.local/share` for data (the variable is used when it is set to a
     * non-empty, absolute path)
     *
     * @param explicitPath - The file path given by the user, if any
     * @param directory - The well-known directory the file lives in by default
     * @param fileName - The name of the file in that directory
     * @returns An effect that resolves to the located file, with `exists`
     * telling whether a regular file is present at its path
     */
    readonly locate: (
      explicitPath: Option.Option<typeof FilePath.Type>,
      directory: WellKnownDirectory,
      fileName: string,
    ) => Effect.Effect<LocatedFile>;
  }
>()("@app/WellKnownFileLocator") {
  /**
   * Builds a layer that resolves `~` with the given home directory lookup
   *
   * @param homeDirectory - Returns the current user's home directory
   */
  static readonly layerWith = (homeDirectory: () => string) =>
    Layer.effect(
      WellKnownFileLocator,
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;

        const wellKnownPath = Effect.fn(
          "well-known-file-locator.well-known-path",
        )(function* (directory: WellKnownDirectory, fileName: string) {
          const { variable, fallback } = wellKnownHomes[directory];
          const xdgHome = yield* Config.String(variable).pipe(
            Config.option,
            Effect.orDie,
          );
          const home = xdgHome.pipe(
            Option.filter((x) => x !== "" && path.isAbsolute(x)),
            Option.getOrElse(() => path.join(homeDirectory(), ...fallback)),
          );
          return FilePath.make(path.join(home, "gleneseo-helpers", fileName));
        });

        const isRegularFile = (filePath: typeof FilePath.Type) =>
          fileSystem.stat(filePath).pipe(
            Effect.map((info) => info.type === "File"),
            Effect.orElseSucceed(() => false),
          );

        const locate = Effect.fn("well-known-file-locator.locate")(function* (
          explicitPath: Option.Option<typeof FilePath.Type>,
          directory: WellKnownDirectory,
          fileName: string,
        ) {
          const located = Option.isSome(explicitPath)
            ? { path: explicitPath.value, source: "flag" as const }
            : {
                path: yield* wellKnownPath(directory, fileName),
                source: "well-known location" as const,
              };

          return { ...located, exists: yield* isRegularFile(located.path) };
        });

        return { locate };
      }),
    );

  static readonly layer = WellKnownFileLocator.layerWith(os.homedir);
}

export default WellKnownFileLocator;
