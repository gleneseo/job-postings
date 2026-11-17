import { assert, describe, it } from "@effect/vitest";
import {
  ConfigProvider,
  Effect,
  FileSystem,
  Layer,
  Option,
  PlatformError,
} from "effect";
import { NodePath } from "@effect/platform-node";
import WellKnownFileLocator from "../../../src/config/well-known-file-locator.js";
import FilePath from "../../../src/helpers/file-path.js";

const home = "/home/test";

/** Makes a file system in which only the given paths exist, with the given types */
const makeLayer = (files: Record<string, "File" | "Directory">) =>
  WellKnownFileLocator.layerWith(() => home).pipe(
    Layer.provide(
      FileSystem.layerNoop({
        stat: (path) =>
          path in files
            ? Effect.succeed({ type: files[path] } as FileSystem.File.Info)
            : Effect.fail(
                PlatformError.systemError({
                  _tag: "NotFound",
                  module: "FileSystem",
                  method: "stat",
                  pathOrDescriptor: path,
                }),
              ),
      }),
    ),
    Layer.provide(NodePath.layer),
  );

const locate = (
  explicit: Option.Option<typeof FilePath.Type>,
  env: Record<string, string>,
  files: Record<string, "File" | "Directory">,
  fileName = "job-postings.json",
  directory: "config" | "data" = "config",
) =>
  Effect.gen(function* () {
    const locator = yield* WellKnownFileLocator;
    return yield* locator.locate(explicit, directory, fileName);
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        makeLayer(files),
        ConfigProvider.layer(ConfigProvider.fromUnknown(env)),
      ),
    ),
  );

const wellKnown = "gleneseo-helpers/job-postings.json";

describe("WellKnownFileLocator", () => {
  it.effect("should use the explicit path when it exists", () =>
    Effect.gen(function* () {
      const result = yield* locate(
        Option.some(FilePath.make("/k.json")),
        {},
        { "/k.json": "File" },
      );

      assert.deepStrictEqual(result, {
        path: "/k.json",
        source: "flag",
        exists: true,
      });
    }),
  );

  it.effect(
    "should report the explicit path as missing without using the well-known location",
    () =>
      Effect.gen(function* () {
        const result = yield* locate(
          Option.some(FilePath.make("/k.json")),
          { XDG_CONFIG_HOME: "/xdg" },
          { [`/xdg/${wellKnown}`]: "File" },
        );

        assert.deepStrictEqual(result, {
          path: "/k.json",
          source: "flag",
          exists: false,
        });
      }),
  );

  it.effect("should use XDG_CONFIG_HOME when it is set", () =>
    Effect.gen(function* () {
      const result = yield* locate(
        Option.none(),
        { XDG_CONFIG_HOME: "/xdg" },
        { [`/xdg/${wellKnown}`]: "File" },
      );

      assert.deepStrictEqual(result, {
        path: `/xdg/${wellKnown}`,
        source: "well-known location",
        exists: true,
      });
    }),
  );

  it.effect("should use the given file name in the well-known location", () =>
    Effect.gen(function* () {
      const result = yield* locate(
        Option.none(),
        { XDG_CONFIG_HOME: "/xdg" },
        { "/xdg/gleneseo-helpers/gmail.json": "File" },
        "gmail.json",
      );

      assert.deepStrictEqual(result, {
        path: "/xdg/gleneseo-helpers/gmail.json",
        source: "well-known location",
        exists: true,
      });
    }),
  );

  it.effect("should fall back to ~/.config when XDG_CONFIG_HOME is unset", () =>
    Effect.gen(function* () {
      const result = yield* locate(
        Option.none(),
        {},
        { [`${home}/.config/${wellKnown}`]: "File" },
      );

      assert.strictEqual(result.path, `${home}/.config/${wellKnown}`);
      assert.isTrue(result.exists);
    }),
  );

  it.effect("should fall back to ~/.config when XDG_CONFIG_HOME is empty", () =>
    Effect.gen(function* () {
      const result = yield* locate(
        Option.none(),
        { XDG_CONFIG_HOME: "" },
        { [`${home}/.config/${wellKnown}`]: "File" },
      );

      assert.strictEqual(result.path, `${home}/.config/${wellKnown}`);
    }),
  );

  it.effect(
    "should fall back to ~/.config when XDG_CONFIG_HOME is relative",
    () =>
      Effect.gen(function* () {
        const result = yield* locate(
          Option.none(),
          { XDG_CONFIG_HOME: "relative" },
          { [`${home}/.config/${wellKnown}`]: "File" },
        );

        assert.strictEqual(result.path, `${home}/.config/${wellKnown}`);
      }),
  );

  it.effect(
    "should not fall back to ~/.config when XDG_CONFIG_HOME is set but the file is missing",
    () =>
      Effect.gen(function* () {
        const result = yield* locate(
          Option.none(),
          { XDG_CONFIG_HOME: "/xdg" },
          { [`${home}/.config/${wellKnown}`]: "File" },
        );

        assert.deepStrictEqual(result, {
          path: `/xdg/${wellKnown}`,
          source: "well-known location",
          exists: false,
        });
      }),
  );

  it.effect("should report a directory as not existing", () =>
    Effect.gen(function* () {
      const result = yield* locate(
        Option.none(),
        { XDG_CONFIG_HOME: "/xdg" },
        { [`/xdg/${wellKnown}`]: "Directory" },
      );

      assert.isFalse(result.exists);
    }),
  );

  it.effect(
    "should use XDG_DATA_HOME for the data directory when it is set",
    () =>
      Effect.gen(function* () {
        const result = yield* locate(
          Option.none(),
          { XDG_DATA_HOME: "/xdg-data", XDG_CONFIG_HOME: "/xdg" },
          { "/xdg-data/gleneseo-helpers/gmail.sqlite": "File" },
          "gmail.sqlite",
          "data",
        );

        assert.deepStrictEqual(result, {
          path: "/xdg-data/gleneseo-helpers/gmail.sqlite",
          source: "well-known location",
          exists: true,
        });
      }),
  );

  for (const [description, env] of [
    ["unset", {}],
    ["empty", { XDG_DATA_HOME: "" }],
    ["relative", { XDG_DATA_HOME: "relative" }],
  ] as const) {
    it.effect(
      `should fall back to ~/.local/share for the data directory when XDG_DATA_HOME is ${description}`,
      () =>
        Effect.gen(function* () {
          const path = `${home}/.local/share/gleneseo-helpers/gmail.sqlite`;
          const result = yield* locate(
            Option.none(),
            env,
            { [path]: "File" },
            "gmail.sqlite",
            "data",
          );

          assert.deepStrictEqual(result, {
            path,
            source: "well-known location",
            exists: true,
          });
        }),
    );
  }

  it.effect("should ignore XDG_CONFIG_HOME for the data directory", () =>
    Effect.gen(function* () {
      const result = yield* locate(
        Option.none(),
        { XDG_CONFIG_HOME: "/xdg" },
        {},
        "gmail.sqlite",
        "data",
      );

      assert.strictEqual(
        result.path,
        `${home}/.local/share/gleneseo-helpers/gmail.sqlite`,
      );
    }),
  );
});
