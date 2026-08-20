# 02: Tool Call to root PID Process Origin

**What to build:** A foreground native PowerShell Tool Call records every valid root process it creates and links each root PID to the exact Tool Call context without changing DSH subprocess behavior.

**Blocked by:** 01: Bundle activation and compatibility gate

**Status:** ready-for-agent

- [ ] A valid spawn records root PID and process creation identity while preserving the original spawn result, handle identity, errors, cancellation, and ownership semantics.
- [ ] Each Process origin contains Session, Agent, Turn, Step, Call ID, root Call ID, Tool name, redacted command, and final workdir.
- [ ] One Tool Call can own multiple roots, and concurrent Agents, nested Code Mode calls, thrown Tool bodies, and cancellation keep their AsyncLocal context isolated.
- [ ] Invalid or unavailable PID values and failed identity reads create no verified Process origin.
- [ ] Origins remain memory-only and available after root exit; observer disposal turns cached proxies into pass-through and does not terminate processes.
