# CLAUDE.md

## Local Effect Source

The Effect v4 repository is cloned to `~/.local/share/vendors/effect` for reference. Use this to explore APIs,
find usage examples, and understand implementation details when the documentation isn't enough.

## Commit messages

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) convention:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common `type` values: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`.

Use `!` after the type/scope (or a `BREAKING CHANGE:` footer) to indicate a breaking change.

## Branching

Never commit directly to `master`. All changes must go through a pull request from a feature branch.

## Git stash

Any `git stash` operation must include untracked files (i.e. pass `-u`/`--include-untracked`).

## Test naming

All test labels (e.g. the string passed to `it`/`test`) must start with "should". For example, "should return a truthy value", or "should find a user".

## Code documentation

IMPORTANT: Code documentation must follow [TSDoc](https://tsdoc.org/) conventions.

Documentation strings must never end in a `.`, unless they include multiple phrases (e.g. multiple sentences), in which case every phrase, including the last, ends in a `.`.

## Project Structure

| Path                                                     | Purpose                                                                                                                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`                                           | Application entry point. Composes dependency layers (services, observability, Node runtime) and executes the root `gleneseo-helpers` CLI command, whose subcommands are the individual helpers. |
| `src/cli/commands/`                                      | Effect CLI command definitions (the root command plus one file per subcommand: `Command.make`, argument/flag configurations, metadata, descriptions).                                           |
| `src/cli/command-handlers/`                              | Effect CLI command handlers containing orchestration logic, progress logging, and domain error handling.                                                                                        |
| `src/<domain>/` (e.g. `src/google/`, `src/file-system/`) | Domain-specific services extending `Context.Service` (with associated `Layer`s) and tagged errors extending `Schema.TaggedError`.                                                               |
| `src/helpers/`                                           | Pure utility functions (e.g. CSV formatting, sorting) and shared Schema / branded types (e.g. `FilePath`, `FolderName`, `SheetIndex`).                                                          |
| `tests/unit/`                                            | Unit tests organized mirroring the `src/` directory hierarchy (e.g. `tests/unit/cli/command-handlers/`, `tests/unit/google/`, `tests/unit/helpers/`).                                           |
| `tests/integration/`                                     | Integration tests and test environment setup (e.g. testcontainers, database fixtures in `tests/integration/setup/`).                                                                            |

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`gleneseo/job-postings`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
