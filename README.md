# job-postings

A CLI that downloads a Google Sheet of job postings, sorts it, and writes it out as CSV.

## Requirements

- Node.js `>=24 <25`
- npm `^12.0.2`
- A running Docker daemon — required by the integration tests (and therefore by `npm test` and `npm run test:coverage`), and separately by `npm run build`, which also builds the production image. See [Testing](#testing) and [Docker](#docker).
- A Google Cloud service account with the Drive and Sheets APIs enabled, its JSON key file downloaded locally, and read access to the target Drive folder (share the folder with the service account's email). See [Usage](#usage).

## Getting started

```sh
npm install
```

## Google Cloud service account setup

The CLI authenticates as a Google Cloud service account, so you need a project with the right APIs enabled and a JSON key file downloaded before you can run it.

1. In the [Google Cloud Console](https://console.cloud.google.com/), select an existing project or create a new one.
2. Enable the [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com) and the [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com) for that project.
3. Go to **IAM & Admin → Service Accounts** and click **Create Service Account**. Give it a name; no project roles are required since access is granted at the Drive folder level (see step 5).
4. Open the new service account, go to the **Keys** tab, click **Add Key → Create new key**, choose **JSON**, and download it. Store this file somewhere safe outside version control — it grants access to anything shared with the service account.
5. Copy the service account's email address (looks like `<name>@<project-id>.iam.gserviceaccount.com`, visible on the service account's details page). In Google Drive, share the folder containing the target sheet with that email address, granting at least **Viewer** access.

With that done, pass the key file's path as the CLI's `key-file-path` argument (see [Usage](#usage)).

## Usage

Locates a Google Sheet in Drive by folder and file name, sorts its rows by `Last Contact` date (undated rows first, ties broken alphabetically by `Company`), and writes the result to a CSV file.

```sh
npm start -- ./key.json
```

An ASCII banner prints before the command runs, but only on an interactive terminal (stdout is a TTY) — it's skipped when output is piped, redirected, or otherwise non-interactive, so it doesn't clutter scripted or CI runs.

| Argument/Flag              | Description                                          | Default            |
| -------------------------- | ---------------------------------------------------- | ------------------ |
| `key-file-path` (argument) | Path to the Google service account JSON key file     | —                  |
| `--folder-name`            | The Google Drive folder that contains the sheet file | `Claude`           |
| `--file-name`              | The sheet file name                                  | `Job Postings`     |
| `--sheet-index`, `-i`      | The 0-based index of the target sheet                | `0`                |
| `--output`, `-o`           | The path for the file's data in CSV format           | `job-postings.csv` |

For example, to read the second sheet of a file named `Applications` in a folder named `2026 Search`, and write it to `applications.csv`:

```sh
npm start -- ./key.json --folder-name "2026 Search" --file-name Applications --sheet-index 1 --output applications.csv
```

The service account only needs read-only access — it authenticates with the `spreadsheets.readonly` and `drive.readonly` scopes.

### Running the compiled CLI

`npm start` runs the CLI from source via `tsx`, with no build step. To run the compiled output instead:

```sh
npm run build:tsc
node dist/src/index.js ./key.json
```

The package also declares a `job-postings` bin pointing at that same compiled entry point (`dist/src/index.js`), so once it's built, either `npm link` or `npm install -g .` exposes it as a `job-postings` command:

```sh
npm run build:tsc
npm link
job-postings ./key.json
```

All flags from the table above work the same way regardless of how the CLI is invoked.

### Exit codes

Each domain error the CLI can fail with exits with its own code, so scripts can distinguish failure causes without parsing the printed message:

| Exit code | Error                        | Meaning                                                   |
| --------- | ---------------------------- | --------------------------------------------------------- |
| `0`       | —                            | Success.                                                  |
| `1`       | —                            | Unexpected failure not covered by the codes below.        |
| `10`      | `FolderSearchError`          | The Drive folder search request failed.                   |
| `11`      | `FolderNotFoundError`        | No folder matched `--folder-name`.                        |
| `12`      | `DuplicateFoldersFoundError` | More than one folder matched `--folder-name`.             |
| `13`      | `MissingFolderIdError`       | The matched folder is missing an ID.                      |
| `20`      | `FileSearchError`            | The Drive file search request failed.                     |
| `21`      | `FileNotFoundError`          | No file matched `--file-name` in the resolved folder.     |
| `22`      | `DuplicateFilesFoundError`   | More than one file matched `--file-name`.                 |
| `23`      | `MissingFileIdError`         | The matched file is missing an ID.                        |
| `30`      | `SheetFetchError`            | Fetching the file's sheets failed.                        |
| `31`      | `InvalidSheetIndexError`     | `--sheet-index` is outside the range of available sheets. |
| `32`      | `SheetValuesFetchError`      | Fetching the target sheet's values failed.                |
| `40`      | `FileWriteError`             | Writing the CSV to `--output` failed.                     |
| `130`     | —                            | Interrupted (e.g. `Ctrl+C`).                              |

## Scripts

| Script                     | Description                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run build`            | Clean, check formatting, lint, compile, test, and build the Docker image. Requires Docker. |
| `npm run build:tsc`        | Compile TypeScript.                                                                        |
| `npm start`                | Run the CLI.                                                                               |
| `npm run start:env`        | Run the CLI with `.env.example` loaded, exporting traces to the local `otel-collector`.    |
| `npm test`                 | Run every test project. Requires Docker.                                                   |
| `npm run test:coverage`    | Run every test project with coverage. Requires Docker.                                     |
| `npm run test:unit`        | Run the unit project only. No Docker required.                                             |
| `npm run test:integration` | Run the integration project only. Requires Docker.                                         |
| `npm run lint`             | Run ESLint.                                                                                |
| `npm run prettier:check`   | Check formatting.                                                                          |
| `npm run prettier:write`   | Apply formatting.                                                                          |
| `npm run clean`            | Remove build and coverage output.                                                          |
| `npm run docker:build`     | Build the production Docker image. Requires Docker.                                        |
| `npm run docker:run`       | Run the production Docker image. Requires Docker.                                          |

## Testing

The suite is split into two [vitest projects](https://vitest.dev/guide/projects):

- **unit** (`tests/unit/**/*.test.ts`) — pure, fast, no external dependencies.
- **integration** (`tests/integration/**/*.test.ts`) — starts real services in throwaway containers via [Testcontainers](https://node.testcontainers.org/).

### Docker requirement

The integration project talks to a Docker daemon over its socket to pull images, start containers, map ports, and tear them down. There is no embedded fallback: with no reachable daemon, the containers fail to start and every integration test fails with them.

`npm test`, `npm run test:coverage`, and `npm run build` all run **every** project, so all three require a running daemon. Any Docker-compatible runtime works — Docker Desktop, Colima, Podman exposing a Docker socket, or a remote host via `DOCKER_HOST`. CI needs a Docker-capable runner.

Use `npm run test:unit` to run the unit project without Docker.

The first run on a machine pays the container image pull, so expect the first integration run to be slower than later ones.

### Shared containers

Containers are started from a [`globalSetup`](https://vitest.dev/config/#globalsetup) registered on the integration project, which runs once in the vitest main process before any test worker spawns. Every integration test file therefore shares **one** container per run, rather than each suite or file starting its own.

Connection details are published with `project.provide()` and read in tests with `inject()`:

```ts
import { inject } from "vitest";

const postgres = inject("postgres");
```

The type of each provided value comes from the `ProvidedContext` interface augmented in `tests/integration/setup/postgres.ts`. Values must be structured-cloneable, so tests receive plain connection details rather than the container handle itself.

Because the container is shared, integration tests are **not** isolated from each other's data. Tests that write to Postgres are responsible for their own isolation — use a schema per file, or truncate what you touched.

This is separate from [Docker Compose](#docker-compose) below — the integration tests manage their own containers on random ports and do not use the Compose services.

### Coverage

Coverage is configured once at the root of `vitest.config.ts` and is measured **across all projects**, not per project. The 100% threshold is evaluated against the union of what every project exercises in `src`, so a line covered only by an integration test counts the same as one covered only by a unit test.

Because of that, only `npm run test:coverage` (and `npm run build`, which calls it) produces meaningful numbers. Running a single project does not collect coverage, since one project's figures would be checked against a threshold that assumes all of them. Note that plain `npm test` does not enforce the threshold either — a green `npm test` is not a guarantee that `npm run build` will pass.

## Docker

The `Dockerfile` builds a production image: it compiles TypeScript in a build stage, installs production-only dependencies in a separate stage, then assembles a minimal runtime image that runs as the non-root `node` user. `ENTRYPOINT` runs `node dist/index.js`, so any arguments passed to `docker run` after the image name are forwarded to the CLI rather than replacing the entrypoint.

`npm run build` builds this image as one of its steps (via `npm run docker:build`), so a running Docker daemon is required to build the project, not just to test it.

### Build the image

```sh
npm run docker:build
```

which is equivalent to:

```sh
docker build . --tag job-postings:latest
```

### Run the container

```sh
npm run docker:run
```

which is equivalent to:

```sh
docker run --rm -it -t job-postings:latest
```

Pass CLI arguments after the image name, e.g. to show help:

```sh
docker run --rm job-postings:latest --help
```

Via `npm run docker:run`, forward arguments after `--`:

```sh
npm run docker:run -- --help
```

## Docker Compose

`docker-compose.yml` provisions local Postgres, Redis, and an OpenTelemetry collector for development.

### Start services

```sh
docker compose up
```

Add `-d` to run in the background:

```sh
docker compose up -d
```

### Stop services

```sh
docker compose down
```

### Services

- **postgres** — Postgres 18, exposed on `localhost:5432` (override with `POSTGRES_PORT`). Credentials and database name default to `postgres` / `postgres` / `default`, configurable via `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.
- **redis** — Redis 8, exposed on `localhost:6379` (override with `REDIS_PORT`).
- **otel-collector** — [`grafana/otel-lgtm`](https://github.com/grafana/docker-otel-lgtm), an all-in-one OpenTelemetry collector plus Grafana, Prometheus, Loki, and Tempo. Exposes the OTLP gRPC receiver on `localhost:4317` (override with `OTEL_COLLECTOR_GRPC_PORT`), the OTLP HTTP receiver on `localhost:4318` (override with `OTEL_COLLECTOR_HTTP_PORT`), and the Grafana UI on `localhost:3000` (override with `OTEL_GRAFANA_PORT`, login `admin` / `admin`).

Override any of these by setting environment variables in your shell or in a `.env` file next to `docker-compose.yml`.

Data is persisted to `.data/postgres`, `.data/redis`, and `.data/otel-lgtm` on the host, so it survives container restarts. Delete those directories to reset a service to a clean state.

### Sending traces to the local collector

The CLI's spans (see [`Effect.withSpan`](https://effect.website)) only export once the standard OpenTelemetry environment variables point at a collector; otherwise tracing is a no-op. With `otel-collector` running, point the CLI at it using one of:

- `npm run start:env` — loads [`.env.example`](.env.example) directly via Node's `--env-file` flag, no setup required:

  ```sh
  npm run start:env -- ./key.json
  ```

- Your own `.env` — copy `.env.example` to `.env` (customize it if your collector isn't on the defaults), then load it the same way:

  ```sh
  cp .env.example .env
  npx tsx --env-file=.env src/index.ts ./key.json
  ```

- Inline environment variables:

  ```sh
  OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 OTEL_TRACES_EXPORTER=otlp npm start -- ./key.json
  ```

Traces show up in Grafana at [http://localhost:3000](http://localhost:3000) under the Tempo data source (Explore → Tempo → search by service name).

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). See [AGENTS.md](./AGENTS.md) for details.
