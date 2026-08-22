---
name: check-effect-update
description: Check whether this project's Effect ecosystem packages (effect, @effect/*) can be updated to their latest available release, review the changelogs in between for breaking changes, and — if it's safe — apply and verify the bump. Use when the user asks to "check for Effect updates", "can we update Effect", "update effect", "is there a new Effect release", or runs `/check-effect-update`.
---

# /check-effect-update — check and apply Effect ecosystem updates

Automates the "is there a newer Effect and can we move to it" flow: find every
`effect` / `@effect/*` package this project depends on, work out the latest
version each one could move to, read the changelog for everything in between
looking for breaking changes, and — if nothing breaking turns up — bump,
install, and verify the project still builds, lints, and passes tests.

This skill only touches `package.json` / the lockfile and verifies the
result. It does not commit or open a PR — hand off to `/open-pr` for that
once you're happy with the result.

## Step 1 — inventory current versions

Read `package.json` and collect every dependency/devDependency named `effect`
or matching `@effect/*`. For each, note the declared range and the range
operator (e.g. `^4.0.0-rc.108`).

## Step 2 — find the latest available version per package

For each package:

- Run `npm view <pkg> versions --json` to list every published version.
- If the currently-installed version is a prerelease (contains `-rc.`,
  `-alpha.`, `-beta.`, etc.), filter to versions sharing that same
  prerelease identifier (e.g. all `4.0.0-rc.*`) and take the highest one —
  don't jump to a different prerelease track or to a stable release that
  hasn't shipped yet unless it's clearly the successor (e.g. no more
  `-rc.*` versions are being published and a real `4.0.0` exists).
- If the currently-installed version is stable, take the highest stable
  version satisfying the same major line, unless the user has asked about
  a major bump specifically.

If every package's current version already matches its target, tell the
user the project is up to date and stop here — nothing else to do.

## Step 3 — review the changelog for everything in between

For each package with a target newer than its current version, read the
release notes for **every version strictly after current, up to and
including target** — not just the target version, since breaking changes
can land in an intermediate release.

- Most `effect` ecosystem packages are published from the
  `Effect-TS/effect` monorepo with tags like `<pkg>@<version>`. Use:
  `gh release view <pkg>@<version> --repo Effect-TS/effect`
- If a package isn't part of that monorepo, check its `repository.url` via
  `npm view <pkg> repository.url` and use `gh release view` against that
  repo instead, or fall back to `npm view <pkg>@<version>` plus the
  package's own CHANGELOG.md if published to npm.
- A local checkout of the Effect source may be available (see
  [AGENTS.md](../../../AGENTS.md) — "Local Effect Source") — useful for
  cross-checking an API that changelog wording is ambiguous about. This
  checkout is a static clone and may be behind the version you're
  targeting — check its current commit/tag (e.g. `git -C
~/.local/share/vendors/effect log -1`) before trusting it. If it doesn't
  cover the target version, mention that to the user and fall back to the
  published changelog/source on GitHub — don't `git pull` or otherwise
  modify the vendor checkout yourself.

While reading, watch for: an explicit "Breaking Change" heading or callout,
a changeset that renames/removes/moves an export the project actually
imports, or a semver-major bump for a non-prerelease package. Patch-level
additions, new APIs, and bug fixes are not blockers.

## Step 4 — report findings, then decide

Summarize per package: current version → target version, and anything
concerning found in Step 3.

- **If breaking changes were found**: stop and lay out what would break and
  why before touching anything — ask the user whether to proceed anyway,
  skip just the affected package, or stop entirely. Don't guess at fixing
  call sites for an API you haven't confirmed changed.
- **If nothing breaking was found**: proceed to Step 5 without waiting for
  confirmation — this mirrors a routine patch/RC bump, not a risky change.

## Step 5 — apply and verify

1. Edit `package.json`, bumping each target package's version spec while
   preserving its existing range operator.
2. Run `npm install`.
3. Verify, in order, stopping at the first failure:
   - `npm run build:tsc` (typecheck)
   - `npm run lint`
   - `npm run test`
   - If the project has a `bin` entry, do a quick smoke run (e.g.
     `npx tsx src/index.ts` or the equivalent) to confirm it still starts.
4. If a step fails: stop, report exactly what failed and the relevant
   output, and leave the working tree as-is for inspection — don't guess at
   fixes for errors caused by the bump, and don't auto-revert. Mention that
   `git checkout -- package.json package-lock.json` (after running
   `npm install` again) is how to back out if the user wants to abandon the
   attempt.
5. If everything passes: report success — which packages moved from which
   version to which — and note that this is uncommitted; the user can
   review the diff and use `/open-pr` when ready to ship it.
