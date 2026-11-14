# Coding standards

The rules a reviewer applies to every change. They are judgement calls that no linter or type checker can enforce. Formatting, lint and type rules live in the tooling (`npm run build`). Commit, branch and layout conventions live in `CLAUDE.md`.

Apply every rule to the whole diff, including the docs and tests the change touches. Cite the rule by its number.

## 1. Domain language

Names, log and error messages, flag descriptions, TSDoc and docs use the terms defined in `GLOSSARY.md`, and avoid each term's _Avoid_ words.

- A page inside the Job Postings sheet is a **Tab**. "Sheet" means the whole Job Postings sheet, and "Google Sheets" or "spreadsheet" names the product or file type.
- When a change introduces or redefines a domain concept, it adds or updates the `GLOSSARY.md` entry in the same change.
- External API identifiers (e.g. Google's `data.sheets`, `spreadsheetId`) keep their own names. The rule applies to the names this repo chooses.

## 2. Branded types for domain values

A value that has a brand in `src/helpers/` (e.g. `TabIndex`, `FolderName`, `FilePath`) carries that brand everywhere it travels: function parameters, service methods, and fields on tagged errors (`tabIndex: TabIndex`, not `Schema.Natural`).

- A new domain value that would otherwise be a bare `string` or `number` gets its own brand in `src/helpers/`.
- Raw values become branded once, at the boundary where they enter (a flag schema, or `X.make(...)` on an API response), and stay branded from there on.

## 3. Domain errors

- Each domain error is a `Schema.TaggedError` in its own file under its domain folder, with TSDoc on the class and on every field.
- It sets a `Runtime.errorExitCode` that is unique across the CLI, grouped by concern in blocks of ten (10s folders, 20s files, 30s tabs, 40s config files, 50s Gmail, 60s email storage). It also sets `Runtime.errorReported = false`.
- The command handler catches it in `catchTags`, logs a human-readable `❌` message that names the user's inputs and the next step to take, and re-fails with the same error.
- The README's exit-code table lists the code, the tag and when it happens.

## 4. Every user-facing change reaches the docs

A change to a flag (added, renamed, new alias, new default) or to an error updates every place that describes it in the same change:

- the flag's `--help` description
- the README flags table and any README examples that use the flag
- the README exit-code table and any prose naming the flag or error

The test is that searching the repo for the old name finds nothing left over.

## 5. Flag naming

- Flags are short nouns with no type suffix: `--file`, `--folder`, `--key`, `--tab`.
- A short alias, when there is one, is the flag's first letter and is unique within its subcommand.
- The description names what the value is and ends with `(default: …)` whenever the flag has a default.
- Equivalent concepts across Helpers use the same flag shape (e.g. `--key`/`-k` and `--credentials`/`-c` both take a path, and both default to a file in the Config directory).

## 6. Services

- A service extends `Context.Service`, exposes a `static readonly layer`, and documents each method with TSDoc.
- Each method is built with `Effect.fn("<service>.<method>")`, both in kebab-case (e.g. `google-tools.get-tab-values`), so trace spans read consistently.
- Every external call (network, file system, database) fails with its own tagged error. A network call also has a timeout that fails with that same error, with a `Cause.TimeoutError` as its cause.

## 7. One home per shape

When the change repeats a logic shape that already exists (the same pipeline, wrapper or message pattern), it reuses or extracts the shared version rather than adding another copy. If the extraction is out of scope, the review names it, and the follow-up goes in a GitHub issue (e.g. #56 for the repeated Google timeout wrapper).

## Mechanical rules (to automate)

These rules are mechanical and belong in a lint rule or test. That work is tracked in #57. Until it lands, review checks them too:

- Test labels start with "should" (`CLAUDE.md`, Test naming).
- Code documentation follows TSDoc. A doc string ends in `.` only when it has several phrases, and then every phrase does (`CLAUDE.md`, Code documentation).
- Unit tests mirror `src/`: `tests/unit/<path>/<name>.test.ts` tests `src/<path>/<name>.ts`.
