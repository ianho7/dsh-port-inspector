# Domain Docs

This is a single-context repository.

Before exploring a change:

- Read `CONTEXT.md` at the repository root when present.
- Read relevant ADRs under `docs/adr/`.
- Use the vocabulary defined by `docs/dsh-runtime-inspector-glossary.md`.
- Surface conflicts with accepted ADRs instead of silently overriding them.

The repository uses one root context and one root `docs/adr/` directory. Domain context files may be added lazily when implementation introduces a stable runtime context.
