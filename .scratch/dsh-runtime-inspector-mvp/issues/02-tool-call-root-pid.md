# 02: Tool Call to root PID Process Origin

**What to build:** A foreground native PowerShell Tool Call records every valid root process it creates and links each root PID to the exact Tool Call context without changing DSH subprocess behavior.

**Blocked by:** 01: Bundle activation and compatibility gate

**Status:** resolved

- [x] A valid spawn records root PID and process creation identity while preserving the original spawn result, handle identity, errors, cancellation, and ownership semantics.
- [x] Each Process origin contains Session, Agent, Turn, Step, Call ID, root Call ID, Tool name, redacted command, and final workdir.
- [x] One Tool Call can own multiple roots, and concurrent Agents, nested Code Mode calls, thrown Tool bodies, and cancellation keep their AsyncLocal context isolated.
- [x] Invalid or unavailable PID values and failed identity reads create no verified Process origin.
- [x] Origins remain memory-only and available after root exit; observer disposal turns cached proxies into pass-through and does not terminate processes.

## Answer

Implemented the supported Stock DSH root-PID attribution slice. The Bundle observes `tools/execute` with an AsyncLocal frame, caches Session `tool/call` metadata, observes `ctx.subprocess.spawn`/`spawnTerminal` through Cordis `internal/get`, and uses a gated, reversible `LocalSubprocessRuntime` method fallback for the pinned stock lookup path. Valid handles are checked with Windows `OpenProcess`/`GetProcessTimes`, stored with a lossless decimal FILETIME creation identity, and deduplicated by exact handle identity. Observer failures, unsupported providers, incomplete execution frames, invalid PIDs, and disposal fail closed without taking process ownership.

Evidence: TypeScript build and no-emit typecheck pass; authoritative Node suite passes 24/24, including the real Stock DSH `dsh-0.1.0-rc.8` Windows lifecycle smoke with native `Start-Sleep`, redacted command attribution, and an unrelated sentinel process surviving plugin disposal.

The implementation is intentionally limited to root origin capture. Windows listener/ancestry matching is Ticket 03.
