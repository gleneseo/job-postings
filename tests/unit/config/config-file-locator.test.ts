import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, FileSystem, Layer, Option } from "effect";
import { NodePath } from "@effect/platform-node";
import ConfigFileLocator from "../../../src/config/config-file-locator.js";
import FilePath from "../../../src/helpers/file-path.js";

const home = "/home/test";

/** Makes a file system in which only the given paths exist, with the given types */
const makeLayer = (files: Record<string, "File" | "Directory">) =>
  ConfigFileLocator.layerWith(() => home).pipe(
    Layer.provide(
      FileSystem.layerNoop({
        stat: (path) =>
          path in files
            ? Effect.succeed({ type: files[path] } as FileSystem.File.Info)
            : Effect.fail(new Error("ENOENT") as never),
      }),
    ),
    Layer.provide(NodePath.layer),
  );

const locate = (
  explicit: Option.Option<typeof FilePath.Type>,
  env: Record<string, string>,
  files: Record<string, "File" | "Directory">,
  fileName = "job-postings.json",
) =>
  Effect.gen(function* () {
    const locator = yield* ConfigFileLocator;
    return yield* locator.locate(explicit, fileName);
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        makeLayer(files),
        ConfigProvider.layer(ConfigProvider.fromUnknown(env)),
      ),
    ),
  );

const wellKnown = "gleneseo-helpers/job-postings.json";

describe("ConfigFileLocator", () => {
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
});
