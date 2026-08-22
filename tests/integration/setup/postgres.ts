import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { getContainerRuntimeClient } from "testcontainers";
import type { TestProject } from "vitest/node";

const POSTGRES_IMAGE = "postgres:18-alpine";

// `start()` only hands back a container once startup has fully succeeded, so a
// rejection part way through leaves nothing to call `stop()` on. Testcontainers
// cleans up after itself when the *wait strategy* fails, but not when the steps
// between "container created" and "wait for ready" do, which leaves a running
// container that only Ryuk will reap. `containerCreated` is the library's own
// hook for that window: it fires with the id immediately after creation.
class TrackedPostgreSqlContainer extends PostgreSqlContainer {
  #createdContainerId: string | undefined;

  get createdContainerId(): string | undefined {
    return this.#createdContainerId;
  }

  protected override containerCreated(containerId: string): Promise<void> {
    this.#createdContainerId = containerId;
    return Promise.resolve();
  }
}

const discardOrphan = async (
  containerId: string | undefined,
): Promise<void> => {
  if (containerId === undefined) {
    return;
  }

  try {
    const client = await getContainerRuntimeClient();
    const orphan = client.container.getById(containerId);
    await client.container.stop(orphan, { timeout: 0 });
    await client.container.remove(orphan, { removeVolumes: true });
  } catch {
    // Best effort. The container is usually already gone — testcontainers
    // removes it itself on a wait-strategy failure — and Ryuk reaps anything
    // this misses. Never mask the startup error that got us here.
  }
};

declare module "vitest" {
  interface ProvidedContext {
    postgres: PostgresConnection;
  }
}

// Runs once per integration run in the vitest main process, before any worker
// starts, so every test file shares a single container instead of starting one
// per suite. Declared on the integration project only, so it never runs for
// `npm run test:unit`.
const setup = async (project: TestProject): Promise<() => Promise<void>> => {
  const factory = new TrackedPostgreSqlContainer(POSTGRES_IMAGE);

  let container: StartedPostgreSqlContainer;
  try {
    container = await factory.start();
  } catch (error) {
    await discardOrphan(factory.createdContainerId);
    throw error;
  }

  project.provide("postgres", {
    connectionUri: container.getConnectionUri(),
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    username: container.getUsername(),
    password: container.getPassword(),
  });

  return async (): Promise<void> => {
    await container.stop();
  };
};

interface PostgresConnection {
  connectionUri: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export type { PostgresConnection };
export default setup;
