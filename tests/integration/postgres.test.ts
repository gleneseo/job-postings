import { Socket } from "node:net";
import { describe, expect, inject, it } from "vitest";

const CONNECT_TIMEOUT_MS = 5_000;

const isListening = async (host: string, port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = new Socket();

    const finish = (reachable: boolean): void => {
      // Drop the one-shot listeners and keep a no-op error handler attached: a
      // socket that emits "error" with no listener throws, which would kill the
      // worker instead of failing this test.
      socket.removeAllListeners();
      socket.on("error", () => {
        // Ignored: the outcome is already decided.
      });
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once("connect", () => {
      finish(true);
    });
    socket.once("timeout", () => {
      finish(false);
    });
    socket.once("error", () => {
      finish(false);
    });
    socket.connect(port, host);
  });

describe("postgres testcontainer", () => {
  const postgres = inject("postgres");

  it("should expose connection details to tests", () => {
    const actual = postgres;

    expect(actual.connectionUri).toMatch(/^postgres(ql)?:\/\//);
    expect(actual.port).toBeGreaterThan(0);
  });

  it("should accept connections on the mapped port", async () => {
    const { host, port } = postgres;

    const actual = await isListening(host, port);

    expect(actual).toBeTruthy();
  });
});
