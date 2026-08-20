# Runtime Inspector MVP Loop Spec

## Goal and acceptance surface

Deliver a usable Windows MVP on the supported Stock DSH baseline. The acceptance surface is the real lifecycle:

```text
Bundle restart → Tool Call → OS process → root PID/creation identity
→ Windows listener/ancestry scan → attribution → managed or external action
→ fresh scan confirming the observed result
```

A unit test, direct helper replay, or green build is supporting evidence only unless it executes the corresponding lifecycle boundary.

## Durable state and workflow

The ticket files are the work DAG. This file defines the loop; `state.md` records the current run. Keep raw evidence separate from summaries.

```text
phase: inspect | implement | verify | retry | handoff | accept
status: waiting | running | blocked | mitigated | complete | budget_exhausted | risk_stop
```

Advance only after the current ticket's verifier passes. Choose the lowest-numbered unblocked ticket. A failed verifier updates the state and evidence record before another action; it never silently regenerates the plan.

## Evidence-surface map

| Gate | Real path | Independent verifier | Evidence role |
| --- | --- | --- | --- |
| G1 | Bundle restart on supported and unsupported DSH | boot/health smoke plus compatibility contract check | acceptance |
| G2 | Foreground/background Tool Call creates a root | fresh integration run plus OS PID/creation snapshot | acceptance |
| G3 | PowerShell → npm → Node listener ancestry | Windows listener scan, same-name control, PID-reuse fixture | acceptance |
| G4 | Job/Terminal owner shutdown | owner API result, bounded wait, and post-action process scan | acceptance |
| G5 | `port_list` and UI privacy/action boundary | redacted payload inspection plus UI/Host integration run | acceptance |
| G6 | Two-Session end-to-end investigation | independent full workflow run and fresh listener scan | final acceptance |

For every repeated probe record: probe ID, baseline, changed condition, inputs, expected raw signal, observed raw signal path, exit code, timestamps, coverage (`yes`/`partial`/`no`), and interpretation boundary.

## Failure and retry policy

- `transient`: retry the same probe once with raw evidence.
- `strategy`: switch implementation or verifier after one disconfirming result; do not repeat unchanged.
- `environment` or `policy`: stop, preserve the reproducer, and hand off the exact missing access or approval.
- `unknown`: narrow the observation surface before editing code.
- Safety or identity ambiguity: `risk_stop`; remain read-only.

No infinite retries. A workaround is `mitigated`, not `complete`, until the real acceptance surface passes.

## Exit conditions

- `complete`: G1–G6 pass and required regression checks pass.
- `mitigated`: safe read-only usefulness is restored while a required gate remains open.
- `blocked`: raw evidence, the missing condition, owner, and next acceptance action are recorded.
- `budget_exhausted`: attempts and next-best action are recorded.
- `risk_stop`: the next action would exceed the MVP safety or permission boundary.

## Policy

Use no DSH core patch, provider replacement, automatic elevation, secret collection, or remote Issue dependency. Process termination remains identity-fenced and must never be inferred from a green component test.
