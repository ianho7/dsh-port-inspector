# Repository Guidelines

## Project Structure & Module Organization

The repository contains the Windows MVP bundle implementation plus its specification and design records. Keep runtime code in `src/`, tests in `tests/`, and product or implementation documents under `docs/`:

- `docs/dsh-runtime-inspector-mvp.md` — product scope and acceptance baseline.
- `docs/dsh-runtime-inspector-mvp-spec.md` — implementation-ready specification.
- `docs/dsh-runtime-inspector-root-pid-research.md` — DSH source research and evidence.
- `docs/dsh-runtime-inspector-glossary.md` — canonical domain vocabulary.
- `docs/dsh-runtime-inspector-testing.md` — build, package installation, manual acceptance, and opt-in Stock DSH gates.
- `docs/adr/` — accepted architectural decisions, using numbered filenames.
- `docs/agents/` — repository configuration consumed by engineering skills.
- `src/compatibility.ts` and `src/index.ts` — compatibility gate and DSH Host plugin entrypoint.
- `src/client/` and `src/client.ts` — DSH Web Browser half, Sidebar entry, overlay panel, and Browser RPC.
- `src/dsh-adapters.ts` — Host-only adapters for certified DSH capabilities such as `apiProxy.host.openPath`.
- `tests/` — unit, manifest, lifecycle, Host/Browser bridge, and optional Stock DSH smoke tests.
- `package.json`, `tsconfig.json`, `cordis.patch.yml` — package, TypeScript, and bundle metadata.

## Build, Test, and Development Commands

Install dependencies and run the authoritative checks before committing:

```powershell
npm install
npm run build       # emit lib/ JavaScript and declarations
npm run typecheck   # strict TypeScript check without emitting
npm test            # build, then run the Node test suite
```

The deterministic suite does not require a DSH checkout. Real Stock DSH tests are skipped unless `DSH_REPO` points to a local checkout. Run the lifecycle smoke explicitly when changing Host/runtime behavior:

```powershell
$env:DSH_REPO = 'D:\project\deepseek-harness'
node --test tests/dsh-bundle-smoke.test.mjs
```

The real Browser-to-Host smoke is opt-in because it starts a browser and disposable listeners:

```powershell
$env:DSH_REPO = 'D:\project\deepseek-harness'
$env:DSH_WEB_E2E = '1'
node --test tests/dsh-web-smoke.test.mjs
```

Before committing any code or documentation change, run `git diff --check`.

## Coding Style & Naming Conventions

Use Markdown headings and direct paragraphs. Preserve DSH symbol names exactly (`Process origin`, `Verified attribution`, `Lifecycle owner`, `Managed shutdown`). Name documents in lowercase kebab-case; name ADRs with a zero-padded number and descriptive slug, such as `0001-stock-dsh-root-pid-observation.md`. Keep commands, paths, and API symbols in backticks. Keep Browser code in the same package as the Host half; do not introduce a companion Web repository or standalone Runtime Inspector server.

## Testing Guidelines

Tests use Node's built-in `node:test` runner and `.test.mjs` names. Keep unit and integration tests under `tests/`; group cases by behavior rather than mirroring source directories. Cover root PID attribution, concurrent Tool Calls, Job/Terminal ownership, late service publication, PID reuse, safe termination, `port_list` object-rooted JSON Schema, Host path opening, clipboard acceptance, and Browser-to-Host state/action boundaries. The Stock DSH lifecycle and Web smoke tests are acceptance gates and must remain independent of production test doubles.

## Commit & Pull Request Guidelines

Recent history uses concise Conventional Commit-style subjects with an imperative scope, for example `feat(runtime-inspector): ...`, `test: ...`, and `docs: ...`. Pull requests should explain the outcome, list changed decisions or files, link the GitHub issue or local ticket when applicable, and state deterministic plus real Stock DSH validation. Include screenshots only for UI changes.

## Architecture & Safety Notes

The MVP uses Stock DSH `dsh-0.1.0-rc.8`, `dsh-0.1.1-rc.1`, and `dsh-0.1.1-rc.2` as regression baselines, on Windows local execution only. DSH version is diagnostic metadata rather than a feature gate: public behavior is enabled from runtime capability probes, while the private delayed-Terminal PID repair remains exact-version and exact-shape gated. Root PID observation uses the Cordis `internal/get` non-mutating subprocess Proxy and a reversible, provider-specific fallback; it must not replace providers or own process teardown. If `subprocess` is published after Bundle apply, recheck the capability gate on `internal/service`; never treat an unknown provider as a verified local provider. Keep commands and paths redacted, never collect environment secrets, require PID plus creation-time identity before termination, and fail closed per capability when contracts or permissions are insufficient. Source tracking failure must not by itself disable an independently revalidated external single-PID action.

The package is a same-repository DSH dual-face Bundle. Browser code may use only serializable same-origin Host RPC; it must not import Windows scanner, process identity, Koffi, Job/Terminal, or termination primitives. Opening a project directory must stay Host-owned through the certified DSH path opener, and `port_list` remains read-only with an object-rooted JSON Schema.

## Agent skills

### Issue tracker

Issues and specs for this repo live as local Markdown files under `.scratch/`; follow the local tracker conventions in `docs/agents/issue-tracker.md`.

### Triage labels

Use the repository's canonical triage roles and mappings in `docs/agents/triage-labels.md` when claiming or resolving tickets.

### Verification loop

For multi-step MVP work, follow the durable acceptance and evidence rules in `.scratch/dsh-runtime-inspector-mvp/loop-spec.md` and update its `state.md`; do not treat a green unit test as proof of the full DSH lifecycle.

### Domain docs

This is a single-context repo. Read the root domain context when present and relevant ADRs under `docs/adr/`. See `docs/agents/domain.md`.
