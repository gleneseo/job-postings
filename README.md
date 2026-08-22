# gleneseo

A CLI that downloads a Google Sheet of job postings, sorts it, and writes it out as CSV.

## Requirements

- Node.js `>=24 <25`
- npm `^12.0.2`
- A Google Cloud service account with the Drive and Sheets APIs enabled, its JSON key file downloaded locally, and read access to the target Drive folder (share the folder with the service account's email). See [Usage](#usage).

## Getting started

```sh
npm install
```

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

## Docker

The `Dockerfile` builds a production image: it compiles TypeScript in a build stage, installs production-only dependencies in a separate stage, then assembles a minimal runtime image that runs as the non-root `node` user. `ENTRYPOINT` runs `node dist/index.js`, so any arguments passed to `docker run` after the image name are forwarded to the CLI rather than replacing the entrypoint.

### Build the image

```sh
npm run docker:build
```

which is equivalent to:

```sh
docker build . --tag gleneseo-ts-template:latest
```

### Run the container

```sh
npm run docker:run
```

which is equivalent to:

```sh
docker run --rm -it -t gleneseo-ts-template:latest
```

Pass CLI arguments after the image name, e.g. to show help:

```sh
docker run --rm gleneseo-ts-template:latest --help
```

Via `npm run docker:run`, forward arguments after `--`:

```sh
npm run docker:run -- --help
```
