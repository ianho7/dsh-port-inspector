# 07: Listener inventory and safe UI actions

**What to build:** The Runtime Inspector UI makes listener ownership understandable and exposes only the shutdown actions allowed by each record's confidence and lifecycle state.

**Blocked by:** 04: Managed Job and Terminal lifecycle attribution; 05: External single-PID termination safety; 06: Read-only port_list and privacy/session scope

**Status:** ready-for-agent

- [ ] The inventory shows port, address, PID, executable, project, confidence, Session visibility, and lifecycle owner.
- [ ] Users can search and sort by port, application, PID, project, and Session, and can copy redacted details or open an available project directory.
- [ ] Managed shutdown, external single-PID termination, read-only, and degraded states have distinct labels, confirmations, and failure messages.
- [ ] After an action, the UI performs a fresh scan and reports the observed port-release state instead of assuming success.
- [ ] UI and Host RPC tests verify privacy boundaries and that unavailable actions cannot be invoked.
