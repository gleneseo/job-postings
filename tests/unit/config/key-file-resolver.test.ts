import { assert, describe, it } from "@effect/vitest";
import { ConfigProvider, Effect, FileSystem, Layer, Option } from "effect";
import { NodePath } from "@effect/platform-node";
import KeyFileResolver from "../../../src/config/key-file-resolver.js";
import KeyFileNotFoundError from "../../../src/config/key-file-not-found-error.js";
import FilePath from "../../../src/helpers/file-path.js";

const home = "/home/test";

/** Makes a file system in which only the given paths exist, with the given types */
const makeLayer = (files: Record<string, "File" | "Directory">) =>
  KeyFileResolver.layerWith(() => home).pipe(
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

const resolve = (
  explicit: Option.Option<typeof FilePath.Type>,
  env: Record<string, string>,
  files: Record<string, "File" | "Directory">,
) =>
  Effect.gen(function* () {
    const resolver = yield* KeyFileResolver;
    return yield* resolver.resolve(explicit);
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        makeLayer(files),
        ConfigProvider.layer(ConfigProvider.fromUnknown(env)),
      ),
    ),
  );

const wellKnown = "gleneseo-helpers/job-postings.json";

describe("KeyFileResolver", () => {
  it.effect("should use the explicit path when it exists", () =>
    Effect.gen(function* () {
      const result = yield* resolve(
        Option.some(FilePath.make("/k.json")),
        {},
        { "/k.json": "File" },
      );

      assert.deepStrictEqual(result, { path: "/k.json", source: "flag" });
    }),
  );

  it.effect("should fail when the explicit path does not exist", () =>
    Effect.gen(function* () {
      const error = yield* resolve(
        Option.some(FilePath.make("/k.json")),
        {},
        { [`/xdg/${wellKnown}`]: "File" },
      ).pipe(Effect.flip);

      assert.deepStrictEqual(
        error,
        new KeyFileNotFoundError({ path: "/k.json", source: "flag" }),
      );
    }),
  );

  it.effect("should use XDG_CONFIG_HOME when it is set", () =>
    Effect.gen(function* () {
      const result = yield* resolve(
        Option.none(),
        { XDG_CONFIG_HOME: "/xdg" },
        { [`/xdg/${wellKnown}`]: "File" },
      );

      assert.deepStrictEqual(result, {
        path: `/xdg/${wellKnown}`,
        source: "well-known location",
      });
    }),
  );

  it.effect("should fall back to ~/.config when XDG_CONFIG_HOME is unset", () =>
    Effect.gen(function* () {
      const result = yield* resolve(
        Option.none(),
        {},
        { [`${home}/.config/${wellKnown}`]: "File" },
      );

      assert.strictEqual(result.path, `${home}/.config/${wellKnown}`);
    }),
  );

  it.effect("should fall back to ~/.config when XDG_CONFIG_HOME is empty", () =>
    Effect.gen(function* () {
      const result = yield* resolve(
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
        const result = yield* resolve(
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
        const error = yield* resolve(
          Option.none(),
          { XDG_CONFIG_HOME: "/xdg" },
          { [`${home}/.config/${wellKnown}`]: "File" },
        ).pipe(Effect.flip);

        assert.deepStrictEqual(
          error,
          new KeyFileNotFoundError({
            path: `/xdg/${wellKnown}`,
            source: "well-known location",
          }),
        );
      }),
  );

  it.effect("should fail when the path is a directory", () =>
    Effect.gen(function* () {
      const error = yield* resolve(
        Option.none(),
        { XDG_CONFIG_HOME: "/xdg" },
        { [`/xdg/${wellKnown}`]: "Directory" },
      ).pipe(Effect.flip);

      assert.strictEqual(error._tag, "KeyFileNotFoundError");
    }),
  );
});
