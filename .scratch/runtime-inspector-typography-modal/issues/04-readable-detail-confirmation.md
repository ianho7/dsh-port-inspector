# 04: Readable detail pane and confirmation dialog

**What to build:** Upgrade the selected-listener detail pane and confirmation dialog to the same readable hierarchy as the list. The selected port and identity should be prominent, facts and technical values should be inspectable, long source/handling explanations should wrap safely, and copy, directory, action, cancel, and confirm controls should remain reachable at every supported width.

**Blocked by:** 01: Typography system and responsive modal shell

**Status:** ready-for-agent

- [ ] The detail heading gives the selected port a clear primary hierarchy, keeps toolchain/executable/PID context readable, and preserves the existing copy and project-directory actions.
- [ ] Detail heading identity content can shrink, wrap, or ellipsize by role so action buttons never cover the logo, port, executable, or PID.
- [ ] Section headings, fact labels, fact values, Session/Tool Call data, and technical identifiers use deliberate readable sizes and appropriate monospace treatment where useful.
- [ ] Long project directories, launch commands, user requests, Session IDs, Call IDs, and other marked multiline values wrap at safe boundaries; compact values remain bounded by ellipsis where appropriate.
- [ ] Source descriptions and handling explanations use paragraph line-height that is comfortable in Chinese and English and do not create page-level horizontal overflow.
- [ ] The handling card reflows or stacks its explanation and action before the action is clipped; narrow-screen full-width action behavior remains intact.
- [ ] The confirmation dialog remains centered within the panel, keeps its alert-dialog semantics and safe focus behavior, and can display larger copy without clipping identity values or action buttons.
- [ ] Process origin, Verified attribution, Inferred attribution, Lifecycle owner, Managed shutdown, Direct external termination, read-only, and confirmation safety semantics remain unchanged.
- [ ] Client presentation tests cover long detail values, both locales, narrow detail widths, handling-card reflow, and confirmation-dialog reachability.
