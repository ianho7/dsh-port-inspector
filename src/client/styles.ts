const RUNTIME_INSPECTOR_CSS = String.raw`
.dsh-ri-entry,
.dsh-ri-panel {
  --dsh-ri-bg: var(--dsw-alias-bg-layer-1, #ffffff);
  --dsh-ri-bg-muted: var(--dsw-alias-bg-layer-2, #f6f7f9);
  --dsh-ri-bg-raised: var(--dsw-alias-bg-layer-3, #ffffff);
  --dsh-ri-label: var(--dsw-alias-label-primary, #17191d);
  --dsh-ri-label-secondary: var(--dsw-alias-label-secondary, #555b63);
  --dsh-ri-label-tertiary: var(--dsw-alias-label-tertiary, #7c838c);
  --dsh-ri-label-caption: var(--dsw-alias-label-caption, #9198a1);
  --dsh-ri-border: var(--dsw-alias-border-l2, #e3e6ea);
  --dsh-ri-border-soft: var(--dsw-alias-border-l3, #eef0f2);
  --dsh-ri-accent: var(--dsw-alias-brand-primary, #3066c7);
  --dsh-ri-accent-soft: var(--dsw-alias-fill-tsp-secondary, #edf3ff);
  --dsh-ri-success: var(--dsw-alias-brand-primary, #2f704f);
  --dsh-ri-warning: var(--dsw-alias-label-error, #b34a45);
  --dsh-ri-shadow: 0 18px 46px rgba(20, 26, 36, 0.16), 0 3px 12px rgba(20, 26, 36, 0.08);
  color: var(--dsh-ri-label);
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif);
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

.dsh-ri-entry {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 9px;
  color: var(--dsh-ri-label-secondary);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 140ms ease, color 140ms ease;
}

.dsh-ri-entry:hover {
  color: var(--dsh-ri-label);
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-entry.is-compact {
  justify-content: center;
  width: 40px;
  padding: 0;
}

.dsh-ri-entry-icon {
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--dsh-ri-accent);
}

.dsh-ri-entry-label {
  min-width: 0;
  font-weight: 600;
  white-space: nowrap;
}

.dsh-ri-entry-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 999px;
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.dsh-ri-overlay {
  position: fixed;
  z-index: 1000;
  inset: 0;
  pointer-events: none;
}

.dsh-ri-panel {
  box-sizing: border-box;
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  width: min(968px, calc(100vw - 32px));
  height: calc(100vh - 32px);
  overflow: hidden;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 14px;
  background: var(--dsh-ri-bg);
  box-shadow: var(--dsh-ri-shadow);
  pointer-events: auto;
}

.dsh-ri-panel,
.dsh-ri-panel *,
.dsh-ri-entry {
  box-sizing: border-box;
}

.dsh-ri-panel button,
.dsh-ri-panel input,
.dsh-ri-panel select {
  font: inherit;
}

.dsh-ri-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  min-width: 0;
  padding: 17px 20px 12px;
}

.dsh-ri-title-wrap {
  min-width: 0;
}

.dsh-ri-title {
  margin: 0;
  color: var(--dsh-ri-label);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.dsh-ri-title-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.dsh-ri-mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--dsh-ri-success);
  font-size: 12px;
  font-weight: 600;
}

.dsh-ri-mode.is-limited {
  color: var(--dsh-ri-warning);
}

.dsh-ri-mode-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.dsh-ri-close,
.dsh-ri-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--dsh-ri-label-tertiary);
  background: transparent;
  cursor: pointer;
  transition: color 140ms ease, background-color 140ms ease, border-color 140ms ease;
}

.dsh-ri-close:hover,
.dsh-ri-icon-button:hover {
  border-color: var(--dsh-ri-border);
  color: var(--dsh-ri-label);
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-summary {
  display: flex;
  align-items: stretch;
  min-width: 0;
  margin: 0 20px 12px;
  padding: 0;
  border: 1px solid var(--dsh-ri-border-soft);
  border-radius: 9px;
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-summary-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  padding: 8px 13px;
  border-right: 1px solid var(--dsh-ri-border-soft);
  white-space: nowrap;
}

.dsh-ri-summary-item:last-child {
  border-right: 0;
}

.dsh-ri-summary-value {
  color: var(--dsh-ri-label);
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.dsh-ri-summary-label {
  overflow: hidden;
  color: var(--dsh-ri-label-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
}

.dsh-ri-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 20px 12px;
}

.dsh-ri-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 220px;
  min-width: 120px;
}

.dsh-ri-search-icon {
  position: absolute;
  left: 10px;
  color: var(--dsh-ri-label-tertiary);
  pointer-events: none;
}

.dsh-ri-search input,
.dsh-ri-select,
.dsh-ri-toolbar-button {
  height: 32px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 7px;
  color: var(--dsh-ri-label);
  background: var(--dsh-ri-bg);
}

.dsh-ri-search input {
  width: 100%;
  padding: 0 10px 0 32px;
  outline: none;
}

.dsh-ri-search input::placeholder {
  color: var(--dsh-ri-label-caption);
}

.dsh-ri-search input:focus,
.dsh-ri-select:focus,
.dsh-ri-toolbar-button:focus-visible,
.dsh-ri-close:focus-visible,
.dsh-ri-icon-button:focus-visible,
.dsh-ri-entry:focus-visible {
  border-color: var(--dsh-ri-accent);
  outline: 2px solid color-mix(in srgb, var(--dsh-ri-accent) 24%, transparent);
  outline-offset: 1px;
}

.dsh-ri-select {
  min-width: 92px;
  padding: 0 28px 0 10px;
}

.dsh-ri-toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg);
  cursor: pointer;
  white-space: nowrap;
}

.dsh-ri-toolbar-button:hover {
  color: var(--dsh-ri-label);
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-toolbar-button:disabled,
.dsh-ri-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.dsh-ri-filter-row,
.dsh-ri-scope-row {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
}

.dsh-ri-scope-row {
  padding-right: 7px;
  border-right: 1px solid var(--dsh-ri-border-subtle);
}

.dsh-ri-filter {
  height: 30px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: var(--dsh-ri-label-tertiary);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}

.dsh-ri-filter:hover {
  color: var(--dsh-ri-label);
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-filter.is-active {
  border-color: var(--dsh-ri-border);
  color: var(--dsh-ri-accent);
  background: var(--dsh-ri-accent-soft);
  font-weight: 600;
}

.dsh-ri-banner,
.dsh-ri-result,
.dsh-ri-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 20px 12px;
  padding: 9px 11px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 8px;
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg-muted);
  font-size: 12px;
}

.dsh-ri-banner.is-limited,
.dsh-ri-error {
  border-color: color-mix(in srgb, var(--dsh-ri-warning) 35%, var(--dsh-ri-border));
  color: var(--dsh-ri-warning);
  background: color-mix(in srgb, var(--dsh-ri-warning) 6%, var(--dsh-ri-bg));
}

.dsh-ri-result {
  border-color: color-mix(in srgb, var(--dsh-ri-success) 28%, var(--dsh-ri-border));
  color: var(--dsh-ri-success);
  background: color-mix(in srgb, var(--dsh-ri-success) 6%, var(--dsh-ri-bg));
}

.dsh-ri-body {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(315px, 0.82fr) minmax(385px, 1.18fr);
  min-height: 0;
  border-top: 1px solid var(--dsh-ri-border-soft);
}

.dsh-ri-list-column,
.dsh-ri-detail-column {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.dsh-ri-list-column {
  border-right: 1px solid var(--dsh-ri-border-soft);
}

.dsh-ri-column-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 15px 9px;
  color: var(--dsh-ri-label-secondary);
  font-size: 12px;
  font-weight: 600;
}

.dsh-ri-column-heading-count {
  color: var(--dsh-ri-label-caption);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.dsh-ri-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0 8px 14px;
  list-style: none;
}

.dsh-ri-row {
  position: relative;
  min-width: 0;
}

.dsh-ri-list-group + .dsh-ri-list-group {
  margin-top: 8px;
}

.dsh-ri-list-group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 5px;
  color: var(--dsh-ri-label-secondary);
  font-size: 11px;
  font-weight: 650;
}

.dsh-ri-list-group-heading span:last-child {
  color: var(--dsh-ri-label-caption);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.dsh-ri-other-toggle {
  display: flex;
  width: calc(100% - 16px);
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  margin: 2px 8px 10px;
  padding: 8px 10px;
  border: 1px dashed var(--dsh-ri-border);
  border-radius: 8px;
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg-muted);
  cursor: pointer;
  font-size: 11px;
  text-align: left;
}

.dsh-ri-other-toggle:hover {
  border-color: var(--dsh-ri-border-strong);
  color: var(--dsh-ri-label);
}

.dsh-ri-search-scope-note {
  margin: 0 10px 7px;
  color: var(--dsh-ri-label-tertiary);
  font-size: 10px;
  line-height: 1.5;
}

.dsh-ri-row-button {
  display: block;
  width: 100%;
  padding: 10px 10px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
}

.dsh-ri-row-button:hover {
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-row-button.is-selected {
  border-color: transparent;
  background: color-mix(in srgb, var(--dsh-ri-accent) 5%, var(--dsh-ri-bg-panel));
  box-shadow: inset 3px 0 0 var(--dsh-ri-accent);
}

.dsh-ri-row-button.is-selected .dsh-ri-port {
  color: var(--dsh-ri-accent);
}

.dsh-ri-row-button.has-pin {
  padding-right: 40px;
}

.dsh-ri-pin-button {
  position: absolute;
  right: 10px;
  bottom: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--dsh-ri-label-tertiary);
  background: transparent;
  cursor: pointer;
}

.dsh-ri-pin-button:hover,
.dsh-ri-pin-button.is-pinned {
  border-color: color-mix(in srgb, var(--dsh-ri-accent) 20%, var(--dsh-ri-border));
  color: var(--dsh-ri-accent);
  background: color-mix(in srgb, var(--dsh-ri-accent) 6%, var(--dsh-ri-bg));
}

.dsh-ri-pin-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dsh-ri-accent) 24%, transparent);
  outline-offset: 1px;
}

.dsh-ri-row-button:focus-visible {
  border-color: var(--dsh-ri-accent);
  outline: 2px solid color-mix(in srgb, var(--dsh-ri-accent) 24%, transparent);
  outline-offset: 1px;
}

.dsh-ri-row-top,
.dsh-ri-row-meta,
.dsh-ri-detail-head,
.dsh-ri-action-line,
.dsh-ri-owner-line {
  display: flex;
  align-items: center;
  min-width: 0;
}

.dsh-ri-row-top,
.dsh-ri-detail-head {
  justify-content: space-between;
  gap: 9px;
}

.dsh-ri-port,
.dsh-ri-detail-port {
  color: var(--dsh-ri-label);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.dsh-ri-protocol {
  display: inline-flex;
  align-items: center;
  height: 20px;
  margin-left: 5px;
  padding: 0 5px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 5px;
  color: var(--dsh-ri-label-tertiary);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.dsh-ri-toolchain-line,
.dsh-ri-detail-identity {
  display: flex;
  align-items: center;
  min-width: 0;
}

.dsh-ri-toolchain-line {
  gap: 8px;
  margin-top: 6px;
}

.dsh-ri-toolchain-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.dsh-ri-toolchain-name {
  color: var(--dsh-ri-label);
  font-size: 12px;
  font-weight: 650;
  line-height: 1.25;
}

.dsh-ri-executable {
  overflow: hidden;
  color: var(--dsh-ri-label-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-toolchain-logo {
  display: block;
  flex: 0 0 auto;
  object-fit: contain;
}

.dsh-ri-toolchain-logo.is-compact {
  width: 24px;
  height: 24px;
}

.dsh-ri-toolchain-logo.is-detail {
  width: 36px;
  height: 36px;
}

.dsh-ri-toolchain-logo.is-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 7px;
  color: var(--dsh-ri-label-tertiary);
  background: var(--dsh-ri-bg-muted);
  font-size: 13px;
}

.dsh-ri-row-meta {
  gap: 7px;
  margin-top: 7px;
  color: var(--dsh-ri-label-tertiary);
  font-size: 11px;
}

.dsh-ri-row-meta > span + span::before {
  display: inline-block;
  margin-right: 7px;
  content: '·';
  color: var(--dsh-ri-border);
}

.dsh-ri-source-pill,
.dsh-ri-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  padding: 3px 7px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 999px;
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
}

.dsh-ri-source-pill.is-verified,
.dsh-ri-action-pill.is-managed {
  border-color: color-mix(in srgb, var(--dsh-ri-success) 28%, var(--dsh-ri-border));
  color: var(--dsh-ri-success);
  background: color-mix(in srgb, var(--dsh-ri-success) 6%, var(--dsh-ri-bg));
}

.dsh-ri-source-pill.is-degraded,
.dsh-ri-action-pill.is-disabled {
  border-color: color-mix(in srgb, var(--dsh-ri-warning) 26%, var(--dsh-ri-border));
  color: var(--dsh-ri-warning);
  background: color-mix(in srgb, var(--dsh-ri-warning) 5%, var(--dsh-ri-bg));
}

.dsh-ri-source-signal {
  display: inline-flex;
  flex: 0 0 auto;
}

.dsh-ri-detail-column {
  padding: 18px 20px 24px;
}

.dsh-ri-detail-head {
  align-items: flex-start;
}

.dsh-ri-detail-identity {
  gap: 11px;
}

.dsh-ri-detail-head-copy {
  min-width: 0;
}

.dsh-ri-detail-toolchain {
  margin-bottom: 2px;
  color: var(--dsh-ri-label-secondary);
  font-size: 12px;
  font-weight: 650;
}

.dsh-ri-detail-port {
  font-size: 19px;
  letter-spacing: -0.01em;
}

.dsh-ri-detail-subline {
  overflow: hidden;
  margin-top: 4px;
  color: var(--dsh-ri-label-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-detail-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 5px;
}

.dsh-ri-detail-section {
  margin-top: 19px;
}

.dsh-ri-section-title {
  margin: 0 0 8px;
  color: var(--dsh-ri-label-tertiary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dsh-ri-fact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--dsh-ri-border-soft);
  border-radius: 8px;
  background: var(--dsh-ri-border-soft);
}

.dsh-ri-fact {
  min-width: 0;
  padding: 9px 10px 10px;
  background: var(--dsh-ri-bg);
}

.dsh-ri-fact.is-wide {
  grid-column: 1 / -1;
}

.dsh-ri-fact dt {
  margin-bottom: 3px;
  color: var(--dsh-ri-label-tertiary);
  font-size: 11px;
}

.dsh-ri-fact dd {
  overflow: hidden;
  margin: 0;
  color: var(--dsh-ri-label-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-fact dd.is-multiline {
  white-space: normal;
  overflow-wrap: anywhere;
}

.dsh-ri-source-card,
.dsh-ri-handling-card {
  padding: 11px 12px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 8px;
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-source-card.is-degraded,
.dsh-ri-handling-card.is-disabled {
  border-color: color-mix(in srgb, var(--dsh-ri-warning) 26%, var(--dsh-ri-border));
  background: color-mix(in srgb, var(--dsh-ri-warning) 4%, var(--dsh-ri-bg));
}

.dsh-ri-source-copy,
.dsh-ri-handling-copy {
  margin: 8px 0 0;
  color: var(--dsh-ri-label-secondary);
  font-size: 12px;
}

.dsh-ri-owner-line {
  gap: 7px;
  margin-top: 10px;
  color: var(--dsh-ri-label-secondary);
  font-size: 12px;
}

.dsh-ri-owner-label {
  color: var(--dsh-ri-label-tertiary);
}

.dsh-ri-owner-pill {
  overflow: hidden;
  padding: 3px 7px;
  border-radius: 5px;
  color: var(--dsh-ri-success);
  background: var(--dsh-ri-bg);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-handling-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
}

.dsh-ri-handling-content {
  min-width: 0;
}

.dsh-ri-primary-action,
.dsh-ri-secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 11px;
  border-radius: 7px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.dsh-ri-primary-action {
  border: 1px solid var(--dsh-ri-accent);
  color: var(--dsh-ri-bg);
  background: var(--dsh-ri-accent);
}

.dsh-ri-primary-action:hover {
  filter: brightness(0.94);
}

.dsh-ri-secondary-action {
  border: 1px solid var(--dsh-ri-border);
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg);
}

.dsh-ri-secondary-action:hover {
  color: var(--dsh-ri-label);
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-primary-action:focus-visible,
.dsh-ri-secondary-action:focus-visible,
.dsh-ri-filter:focus-visible {
  border-color: var(--dsh-ri-accent);
  outline: 2px solid color-mix(in srgb, var(--dsh-ri-accent) 24%, transparent);
  outline-offset: 1px;
}

.dsh-ri-primary-action:disabled,
.dsh-ri-secondary-action:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.dsh-ri-state,
.dsh-ri-empty {
  display: grid;
  place-items: center;
  min-height: 180px;
  padding: 24px;
  color: var(--dsh-ri-label-tertiary);
  text-align: center;
}

.dsh-ri-state-icon {
  display: inline-flex;
  margin-bottom: 9px;
  color: var(--dsh-ri-accent);
}

.dsh-ri-empty-title {
  color: var(--dsh-ri-label-secondary);
  font-weight: 600;
}

.dsh-ri-empty-copy {
  max-width: 260px;
  margin: 5px 0 0;
  font-size: 12px;
}

.dsh-ri-confirm-backdrop {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, var(--dsh-ri-label) 22%, transparent);
}

.dsh-ri-confirm {
  width: min(440px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: 19px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 12px;
  background: var(--dsh-ri-bg);
  box-shadow: var(--dsh-ri-shadow);
}

.dsh-ri-confirm-title {
  margin: 0;
  color: var(--dsh-ri-label);
  font-size: 16px;
}

.dsh-ri-confirm-copy {
  margin: 8px 0 0;
  color: var(--dsh-ri-label-secondary);
  font-size: 13px;
}

.dsh-ri-confirm-note {
  display: flex;
  gap: 8px;
  margin-top: 13px;
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--dsh-ri-warning) 25%, var(--dsh-ri-border));
  border-radius: 8px;
  color: var(--dsh-ri-warning);
  background: color-mix(in srgb, var(--dsh-ri-warning) 5%, var(--dsh-ri-bg));
  font-size: 12px;
}

.dsh-ri-confirm-identity {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid var(--dsh-ri-border-soft);
  border-radius: 8px;
  background: var(--dsh-ri-border-soft);
}

.dsh-ri-confirm-identity-item {
  min-width: 0;
  padding: 8px 9px;
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-confirm-identity-label {
  display: block;
  color: var(--dsh-ri-label-tertiary);
  font-size: 11px;
}

.dsh-ri-confirm-identity-value {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: var(--dsh-ri-label-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}

@media (max-width: 900px) {
  .dsh-ri-panel {
    width: min(720px, calc(100vw - 24px));
    height: calc(100vh - 24px);
    top: 12px;
    right: 12px;
  }

  .dsh-ri-body {
    grid-template-columns: minmax(260px, 0.8fr) minmax(330px, 1.2fr);
  }
}

@media (max-width: 720px) {
  .dsh-ri-panel {
    top: 8px;
    right: 8px;
    width: calc(100vw - 16px);
    height: calc(100vh - 16px);
    border-radius: 11px;
  }

  .dsh-ri-header,
  .dsh-ri-toolbar {
    padding-left: 14px;
    padding-right: 14px;
  }

  .dsh-ri-summary {
    margin-left: 14px;
    margin-right: 14px;
  }

  .dsh-ri-toolbar {
    flex-wrap: wrap;
  }

  .dsh-ri-search {
    flex-basis: 100%;
  }

  .dsh-ri-filter-row {
    order: 3;
    width: 100%;
    overflow-x: auto;
  }

  .dsh-ri-body {
    display: block;
    overflow: auto;
  }

  .dsh-ri-list-column,
  .dsh-ri-detail-column {
    overflow: visible;
  }

  .dsh-ri-list-column {
    border-right: 0;
    border-bottom: 1px solid var(--dsh-ri-border-soft);
  }

  .dsh-ri-detail-column {
    padding: 16px 14px 22px;
  }
}

@media (max-width: 480px) {
  .dsh-ri-summary-item {
    flex: 1 1 50%;
    padding-left: 8px;
    padding-right: 8px;
  }

  .dsh-ri-summary {
    flex-wrap: wrap;
  }

  .dsh-ri-summary-item:nth-child(2) {
    border-right: 0;
  }

  .dsh-ri-summary-item:nth-child(-n + 2) {
    border-bottom: 1px solid var(--dsh-ri-border-soft);
  }

  .dsh-ri-fact-grid,
  .dsh-ri-confirm-identity {
    grid-template-columns: 1fr;
  }

  .dsh-ri-fact.is-wide {
    grid-column: auto;
  }

  .dsh-ri-handling-card {
    display: block;
  }

  .dsh-ri-handling-card .dsh-ri-primary-action,
  .dsh-ri-handling-card .dsh-ri-secondary-action {
    width: 100%;
    margin-top: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dsh-ri-entry,
  .dsh-ri-close,
  .dsh-ri-icon-button,
  .dsh-ri-row-button,
  .dsh-ri-toolbar-button {
    transition: none;
  }
}
`

/**
 * The package's Browser build does not currently carry DSH's CSS-module
 * transformer, so keep this one stylesheet namespaced to the Bundle. This
 * preserves the same semantic DSH tokens without introducing global rules.
 */
export function installRuntimeInspectorStyles(): void {
  if (typeof document === 'undefined' || document.head === null) return
  if (document.querySelector('style[data-dsh-runtime-inspector-css]') !== null) return
  const style = document.createElement('style')
  style.setAttribute('data-dsh-runtime-inspector-css', 'true')
  style.textContent = RUNTIME_INSPECTOR_CSS
  document.head.appendChild(style)
}
