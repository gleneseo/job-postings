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

## 8. Effect failures are `Error`s

Every `Effect.fail` (and `yield* new XError(...)`, or a `catch:` in `Effect.tryPromise`/`Effect.try`) fails with an `Error` instance, in `src` and in tests alike.

- In `src`, that is a domain tagged error (rule 3) or an Effect error such as `Cause.TimeoutError` or `CliError`.
- In tests, it is the same tagged error the code under test would raise. When the test needs a stand-in, it uses a small tagged error defined in the test.
- A failure value that is a string, number, plain object or `undefined` is a violation. So is a bare `new Error(...)` passed to `Effect.fail`. A bare `Error` is fine as the `cause` inside a tagged error.

## 9. Every cast in `src` explains itself

In `src`, a type assertion (`x as T`, `x as unknown as T`, `<T>x`) or a non-null assertion (`x!`) has a comment on the line above it saying why the type system can't prove the type and why the cast is safe. A good example is "googleapis types `data.files` loosely; the query's `fields` guarantees `id` and `name`". `as const` is not a cast and needs no comment.

Prefer the alternatives that need no cast: a `Schema` decode, a type guard or `Predicate`, or `satisfies`. A cast whose comment can't name a reason is a sign one of those fits.

Tests are exempt, because their casts usually build test doubles or deliberately malformed inputs.

## 10. Effect helpers over raw JavaScript

When the `effect` library has a helper for the operation, use it instead of the raw JavaScript equivalent. Typical cases:

| Raw JavaScript                                                   | Effect helper                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `arr[i]`, `arr.find(...)` that may miss                          | `Array.get`, `Array.findFirst` (returning `Option`)                   |
| `null`/`undefined` checks, `?? fallback` chains on domain values | `Option` (`Option.fromNullishOr`, `Option.match`, `Option.getOrElse`) |
| `try`/`catch`, `await`, `.then`                                  | `Effect.try`, `Effect.tryPromise`, `Effect.gen`                       |
| `setTimeout`, numeric milliseconds                               | `Effect.sleep`, `Effect.timeout*`, `Duration`                         |
| `JSON.parse` plus manual checks, `typeof` validation             | `Schema.decodeUnknown*`                                               |
| `console.*`, `process.env`, `node:fs`                            | `Console`, `Config`, `FileSystem`                                     |
| Hand-rolled sorting, grouping or comparison                      | `Array.sort` with `Order`, `Array.groupBy`, `Equivalence`             |

Plain language features that have no Effect counterpart worth using stay as they are (property access, template strings, `.length`). The same goes for the boundary of a third-party API (e.g. the `googleapis` promise inside `Effect.tryPromise`). When in doubt, check the local Effect source at `~/.local/share/vendors/effect` for a helper before writing one by hand.

## Mechanical rules (to automate)

These rules are mechanical and belong in a lint rule or test. That work is tracked in #57. Until it lands, review checks them too:

- **Test naming:** every test label (the string passed to `it`, `it.effect` or `test`) starts with "should", e.g. "should return a truthy value" or "should find a user". `describe` labels name the unit under test instead.
- **Code documentation:** code documentation follows [TSDoc](https://tsdoc.org/) conventions. A documentation string never ends in a `.`, unless it includes multiple phrases (e.g. multiple sentences), in which case every phrase, including the last, ends in a `.`.
- Unit tests mirror `src/`: `tests/unit/<path>/<name>.test.ts` tests `src/<path>/<name>.ts`.
