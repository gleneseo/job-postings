import { NodeServices } from "@effect/platform-node";
import { assert, describe, expect, it } from "@effect/vitest";
import { Effect, FileSystem, Layer, Path, PlatformError } from "effect";
import EmailFilesWriteError from "../../../src/gmail/email-files-write-error.js";
import saveEmailFiles from "../../../src/gmail/save-email-files.js";
import type Email from "../../../src/helpers/email.js";

const makeEmail = (id: string, subject: string): typeof Email.Type => ({
  id,
  from: { name: "Ann", email: "ann@example.com" },
  to: { name: "Bob", email: "bob@example.com" },
  subject,
  textBody: "Body",
  htmlBody: "",
  receivedAt: "2026-01-02T03:04:05.000Z",
});

describe("saveEmailFiles", () => {
  it.effect("should create the directory and write a file per email", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped();
      const directory = path.join(root, "out", "nested");

      yield* saveEmailFiles(directory, [
        makeEmail("a", "First"),
        makeEmail("b", "Second"),
      ]);

      assert.deepStrictEqual((yield* fs.readDirectory(directory)).sort(), [
        "First.txt",
        "Second.txt",
      ]);
      expect(yield* fs.readFileString(path.join(directory, "First.txt"))).toBe(
        "From: Ann <ann@example.com>\nTo: Bob <bob@example.com>\nSubject: First\nReceived: 2026-01-02T03:04:05.000Z\n\nBody",
      );
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("should fail with an EmailFilesWriteError when a write fails", () =>
    Effect.gen(function* () {
      const cause = PlatformError.systemError({
        _tag: "PermissionDenied",
        module: "FileSystem",
        method: "writeFileString",
      });
      const FailingFs = FileSystem.layerNoop({
        makeDirectory: () => Effect.void,
        writeFileString: () => Effect.fail(cause),
      });

      const failure = yield* saveEmailFiles("out", [
        makeEmail("a", "First"),
      ]).pipe(
        Effect.provide(Layer.mergeAll(FailingFs, Path.layer)),
        Effect.flip,
      );

      expect(failure).toStrictEqual(
        new EmailFilesWriteError({ directory: "out", cause }),
      );
    }),
  );
});
