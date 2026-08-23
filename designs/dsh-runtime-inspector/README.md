# Runtime Inspector prototype

## Design context

This high-fidelity prototype records the design direction adopted by the production React implementation. The production panel has been implemented and manually accepted; this directory remains design provenance rather than a second runtime surface.

- Product surface: a `shell.overlay` side workbench inside DSH Web.
- Primary job: identify the listener occupying a development port, understand its DSH relationship, and choose the correct safe handling path.
- Visual reference: Stock DSH Web client patterns and the `--dsw-*` semantic theme vocabulary.
- Theme scope: light / white only for this prototype. Production code should consume DSH semantic tokens rather than hard-code a global theme.
- Source model: `DSH 来源已确认` or `来源未确认`; evidence details are progressively disclosed.
- Action model: `停止 DSH 任务`, `结束该进程`, or `仅可查看`; the two action paths use different confirmation content.
- Density direction: the panel header is intentionally minimal, the summary is an inline count rail, and listener rows favor scan density over large cards.
- Confirmed provenance details: show the DSH session title and a bounded user-request summary; keep `Call ID` as a technical trace identifier.

## Prototype controls

The small `预览场景` control is prototype-only. It switches between the normal inventory, empty inventory, incomplete scan, and degraded read-only states so the required product states can be reviewed without a live DSH Host.
