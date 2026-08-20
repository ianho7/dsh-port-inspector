# Repository Guidelines

## Project Structure & Module Organization

The repository contains the Windows MVP bundle implementation plus its specification and design records. Keep runtime code in `src/`, tests in `tests/`, and product or implementation documents under `docs/`:

- `docs/dsh-runtime-inspector-mvp.md` — product scope and acceptance baseline.
- `docs/dsh-runtime-inspector-mvp-spec.md` — implementation-ready specification.
- `docs/dsh-runtime-inspector-root-pid-research.md` — DSH source research and evidence.
- `docs/dsh-runtime-inspector-glossary.md` — canonical domain vocabulary.
- `docs/adr/` — accepted architectural decisions, using numbered filenames.
- `docs/agents/` — repository configuration consumed by engineering skills.
- `src/compatibility.ts` and `src/index.ts` — compatibility gate and DSH plugin entrypoint.
- `tests/` — unit, manifest, lifecycle, and optional Stock DSH smoke tests.
- `package.json`, `tsconfig.json`, `cordis.patch.yml` — package, TypeScript, and bundle metadata.

## Build, Test, and Development Commands

Install dependencies and run the authoritative checks before committing:

```powershell
npm install
npm run build       # emit lib/ JavaScript and declarations
npm run typecheck   # strict TypeScript check without emitting
npm test            # build, then run the Node test suite
```

For the real Stock DSH lifecycle smoke test, set `DSH_REPO` to a local DSH checkout before `npm test`; it is skipped otherwise. Run `git diff --check` for documentation-only changes.

## Coding Style & Naming Conventions

Use Markdown headings and direct paragraphs. Preserve DSH symbol names exactly (`Process origin`, `Verified attribution`, `Lifecycle owner`, `Managed shutdown`). Name documents in lowercase kebab-case; name ADRs with a zero-padded number and descriptive slug, such as `0001-stock-dsh-root-pid-observation.md`. Keep commands, paths, and API symbols in backticks.

## Testing Guidelines

Tests use Node's built-in `node:test` runner and `.test.mjs` names. Keep unit and integration tests under `tests/`; group cases by behavior rather than mirroring source directories. Cover root PID attribution, concurrent Tool Calls, Job/Terminal ownership, PID reuse, and safe termination. The Stock DSH smoke test is the lifecycle gate and must remain independent of production test doubles.

## Commit & Pull Request Guidelines

The repository currently has only an initial commit, so no established convention exists. Use concise imperative subjects with a scope when useful, for example `docs: add runtime inspector spec`. Pull requests should explain the outcome, list changed decisions or files, link the GitHub issue, and state validation. Include screenshots only for UI changes.

## Architecture & Safety Notes

The MVP targets stock DSH `dsh-0.1.0-rc.8` on Windows. Root PID observation uses the Cordis `internal/get` non-mutating subprocess Proxy; it must not replace providers or own process teardown. Keep commands redacted, never collect environment secrets, require PID plus creation-time identity before termination, and fail closed to read-only mode when compatibility or permissions are insufficient. Read the relevant ADRs before changing this behavior.

## Agent skills

### Issue tracker

Issues and specs for this repo live as local Markdown files under `.scratch/`; follow the local tracker conventions in `docs/agents/issue-tracker.md`.

### Triage labels

Use the repository's canonical triage roles and mappings in `docs/agents/triage-labels.md` when claiming or resolving tickets.

### Verification loop

For multi-step MVP work, follow the durable acceptance and evidence rules in `.scratch/dsh-runtime-inspector-mvp/loop-spec.md` and update its `state.md`; do not treat a green unit test as proof of the full DSH lifecycle.

### Domain docs

This is a single-context repo. Read the root domain context when present and relevant ADRs under `docs/adr/`. See `docs/agents/domain.md`.
