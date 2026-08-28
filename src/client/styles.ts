const RUNTIME_INSPECTOR_CSS = String.raw`
.dsh-ri-entry,
.dsh-ri-overlay,
.dsh-ri-panel {
  --dsh-ri-font-sans: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI"), "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  --dsh-ri-font-mono: var(--dsw-font-mono, "SFMono-Regular", "Cascadia Code", "JetBrains Mono", Consolas, "Liberation Mono", monospace);
  --dsh-ri-type-body: 14px;
  --dsh-ri-type-control: 13px;
  --dsh-ri-type-label: 12px;
  --dsh-ri-type-meta: 11px;
  --dsh-ri-type-caption: 10.5px;
  --dsh-ri-type-title: 22px;
  --dsh-ri-type-port: 16px;
  --dsh-ri-type-detail-port: 32px;
  --dsh-ri-leading-body: 1.55;
  --dsh-ri-leading-prose: 1.7;
  --dsh-ri-bg: var(--dsw-alias-bg-layer-2, #ffffff);
  --dsh-ri-bg-muted: var(--dsw-alias-bg-layer-1, #f6f7f9);
  --dsh-ri-bg-raised: var(--dsw-alias-bg-layer-3, #ffffff);
  --dsh-ri-label: var(--dsw-alias-label-primary, #17191d);
  --dsh-ri-label-secondary: var(--dsw-alias-label-secondary, #555b63);
  --dsh-ri-label-tertiary: var(--dsw-alias-label-tertiary, #7c838c);
  --dsh-ri-label-caption: var(--dsw-alias-label-caption, #9198a1);
  --dsh-ri-border: #e2e5e9;
  --dsh-ri-border-soft: #eef0f2;
  --dsh-ri-accent: #3066c7;
  --dsh-ri-accent-soft: #edf3ff;
  --dsh-ri-success: #2f704f;
  --dsh-ri-warning: #b34a45;
  --dsh-ri-danger: #b34743;
  --dsh-ri-shadow: var(--dsw-shadow-lv3, 0 18px 46px rgba(20, 26, 36, 0.16), 0 3px 12px rgba(20, 26, 36, 0.08));
  --dsh-ri-mask: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.24));
  --dsh-ri-mask-blur: var(--dsw-mask-blur, blur(8px));
  --dsh-ri-border-subtle: #eef0f2;
  --dsh-ri-border-strong: #d9dde3;
  --dsh-ri-bg-panel: var(--dsw-alias-bg-layer-2, #ffffff);
  color: var(--dsh-ri-label);
  font-family: var(--dsh-ri-font-sans);
  font-size: var(--dsh-ri-type-body);
  line-height: var(--dsh-ri-leading-body);
  -webkit-font-smoothing: antialiased;
}

.dsh-ri-entry {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 9px;
  width: calc(100% + 4px);
  height: 42px;
  margin: 4px -2px;
  padding: 0 10px 0 8px;
  border: 0;
  border-radius: 12px;
  color: var(--dsh-ri-label);
  background: transparent;
  font-size: 14px;
  line-height: 22px;
  cursor: pointer;
  text-align: left;
  transition: background-color 140ms ease, color 140ms ease;
}

.dsh-ri-entry:hover {
  background: var(--dsw-alias-interactive-bg-hover, var(--dsh-ri-bg-muted));
}

.dsh-ri-entry.is-compact {
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 8px 0 10px;
  padding: 0;
  border-radius: 50%;
}

.dsh-ri-entry-icon {
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--dsh-ri-accent);
}

.dsh-ri-entry-label {
  min-width: 0;
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
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.dsh-ri-mask {
  position: absolute;
  inset: 0;
  background: var(--dsh-ri-mask);
  backdrop-filter: var(--dsh-ri-mask-blur);
  -webkit-backdrop-filter: var(--dsh-ri-mask-blur);
}

.dsh-ri-panel {
  box-sizing: border-box;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 1120px;
  height: min(840px, calc(100vh - 48px));
  max-width: calc(100vw - 48px);
  overflow: hidden;
  border: 0;
  border-radius: 24px;
  background: var(--dsh-ri-bg);
  box-shadow: var(--dsh-ri-shadow);
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2, #d8dce2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2, #c7ccd4);
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

.dsh-ri-content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
}

.dsh-ri-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px;
  flex: none;
  min-width: 0;
  min-height: 64px;
  height: auto;
  padding: 18px 14px 10px 24px;
}

.dsh-ri-header-status,
.dsh-ri-header-actions {
  display: flex;
  align-items: center;
  min-width: 0;
}

.dsh-ri-header-status {
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 10px;
  row-gap: 4px;
}

.dsh-ri-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dsh-ri-brand-logo {
  display: block;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  object-fit: contain;
}

.dsh-ri-header-actions {
  justify-content: flex-end;
  gap: 8px;
  margin-left: auto;
}

.dsh-ri-header-title {
  margin: 0;
  color: var(--dsh-ri-label);
  font-size: var(--dsh-ri-type-title);
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.dsh-ri-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--dsh-ri-label-tertiary);
  max-width: 100%;
  font-size: var(--dsh-ri-type-label);
  font-weight: 600;
  line-height: 1.4;
  white-space: normal;
}

.dsh-ri-status-pill.is-limited {
  color: var(--dsh-ri-warning);
}

.dsh-ri-status-dot {
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

.dsh-ri-close {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
}

.dsh-ri-close:hover,
.dsh-ri-icon-button:hover {
  border-color: var(--dsh-ri-border);
  color: var(--dsh-ri-label);
  background: var(--dsw-alias-interactive-bg-hover, var(--dsh-ri-bg-muted));
}

.dsh-ri-close:hover {
  border-color: transparent;
}

.dsh-ri-options {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 24px 24px;
  overflow: hidden;
}

.dsh-ri-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0 0 12px;
}

.dsh-ri-search {
  position: relative;
  display: flex;
  flex: 1 1 260px;
  align-items: center;
  min-width: 220px;
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
  height: 34px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 7px;
  color: var(--dsh-ri-label);
  background: var(--dsh-ri-bg);
  font-size: var(--dsh-ri-type-control);
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
  min-width: 100px;
  padding: 0 28px 0 10px;
}

.dsh-ri-toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
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

.dsh-ri-scope-row {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 3px;
}

.dsh-ri-toolbar-control {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
}

.dsh-ri-scope-control {
  padding-right: 8px;
  border-right: 1px solid var(--dsh-ri-border-subtle);
}

.dsh-ri-control-label {
  color: var(--dsh-ri-label-tertiary);
  font-size: var(--dsh-ri-type-label);
  white-space: nowrap;
}

.dsh-ri-scope-option {
  height: 30px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--dsh-ri-label-tertiary);
  background: transparent;
  cursor: pointer;
  font-size: var(--dsh-ri-type-control);
  white-space: nowrap;
}

.dsh-ri-scope-option:hover {
  color: var(--dsh-ri-label);
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-scope-option.is-active {
  border-color: var(--dsh-ri-border);
  color: var(--dsh-ri-accent);
  background: var(--dsh-ri-accent-soft);
  font-weight: 600;
}

.dsh-ri-source-select {
  min-width: 126px;
}

.dsh-ri-action-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 8px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 7px;
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg);
  cursor: pointer;
  font-size: var(--dsh-ri-type-control);
  white-space: nowrap;
}

.dsh-ri-action-toggle:hover {
  color: var(--dsh-ri-label);
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-action-toggle input {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: var(--dsh-ri-accent);
}

.dsh-ri-banner,
.dsh-ri-result,
.dsh-ri-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 12px;
  padding: 9px 11px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 8px;
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg-muted);
  font-size: var(--dsh-ri-type-control);
  line-height: var(--dsh-ri-leading-prose);
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
  grid-template-columns: minmax(360px, 0.82fr) minmax(520px, 1.18fr);
  min-height: 0;
  overflow: hidden;
  border-top: 1px solid var(--dsh-ri-border-soft);
}

.dsh-ri-list-column,
.dsh-ri-detail-column {
  min-width: 0;
  min-height: 0;
}

.dsh-ri-list-column {
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid var(--dsh-ri-border-soft);
}

.dsh-ri-detail-column {
  overflow-y: auto;
  overflow-x: hidden;
}

.dsh-ri-column-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 15px 9px;
  color: var(--dsh-ri-label-secondary);
  font-size: var(--dsh-ri-type-label);
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
  font-size: var(--dsh-ri-type-meta);
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
  font-size: var(--dsh-ri-type-meta);
  line-height: 1.5;
  text-align: left;
}

.dsh-ri-other-toggle:hover {
  border-color: var(--dsh-ri-border-strong);
  color: var(--dsh-ri-label);
}

.dsh-ri-search-scope-note {
  margin: 0 10px 7px;
  color: var(--dsh-ri-label-tertiary);
  font-size: var(--dsh-ri-type-caption);
  line-height: var(--dsh-ri-leading-prose);
}

.dsh-ri-row-button {
  appearance: none;
  -webkit-appearance: none;
  display: block;
  width: 100%;
  padding: 10px 11px 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: border-color 140ms ease, background-color 140ms ease;
}

.dsh-ri-row-button:hover {
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-row-button.is-selected {
  border-color: transparent;
  background: var(--dsh-ri-accent-soft);
}

.dsh-ri-row-button.is-selected .dsh-ri-port {
  color: var(--dsh-ri-accent);
}

.dsh-ri-row-button.has-pin {
  padding-right: 10px;
}

.dsh-ri-pin-button {
  position: absolute;
  right: 10px;
  bottom: 11px;
  display: none;
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
  border-color: transparent;
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

.dsh-ri-row-top,
.dsh-ri-row-meta {
  flex-wrap: wrap;
  row-gap: 4px;
}

.dsh-ri-port,
.dsh-ri-detail-port {
  display: flex;
  align-items: center;
  color: var(--dsh-ri-label);
  font-family: var(--dsh-ri-font-mono);
  font-size: var(--dsh-ri-type-port);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  white-space: nowrap;
}

.dsh-ri-port .dsh-ri-protocol {
  margin-left: 5px;
}

.dsh-ri-protocol {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 5px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 5px;
  color: var(--dsh-ri-label-tertiary);
  font-family: var(--dsh-ri-font-mono);
  font-size: var(--dsh-ri-type-caption);
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
  margin-top: 5px;
}

.dsh-ri-toolchain-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.dsh-ri-toolchain-name {
  color: var(--dsh-ri-label);
  font-size: var(--dsh-ri-type-label);
  font-weight: 650;
  line-height: 1.35;
}

.dsh-ri-executable {
  overflow: hidden;
  color: var(--dsh-ri-label-secondary);
  font-size: var(--dsh-ri-type-meta);
  line-height: 1.4;
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

.dsh-ri-compose-logo {
  display: block;
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  object-fit: contain;
  opacity: 0.78;
}

.dsh-ri-row-meta {
  gap: 7px;
  margin-top: 6px;
  color: var(--dsh-ri-label-tertiary);
  font-size: var(--dsh-ri-type-meta);
  line-height: 1.45;
}

.dsh-ri-row-meta > span:not(.dsh-ri-action-pill) + span:not(.dsh-ri-action-pill)::before {
  display: inline-block;
  margin-right: 7px;
  content: '·';
  color: var(--dsh-ri-border);
}

.dsh-ri-source-pill,
.dsh-ri-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  padding: 2px 7px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 999px;
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg);
  overflow: hidden;
  font-size: var(--dsh-ri-type-caption);
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-compose-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  padding: 2px 7px;
  border: 1px solid var(--dsh-ri-border);
  border-color: color-mix(in srgb, var(--dsh-ri-label-secondary) 32%, var(--dsh-ri-border));
  border-radius: 999px;
  color: var(--dsh-ri-label-secondary);
  background: var(--dsh-ri-bg-muted);
  overflow: hidden;
  font-size: var(--dsh-ri-type-caption);
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-pill-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-technical-value {
  font-family: var(--dsh-ri-font-mono);
  font-variant-numeric: tabular-nums;
}

.dsh-ri-row-address {
  display: inline-block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-source-pill.is-verified,
.dsh-ri-action-pill.is-managed {
  border-color: color-mix(in srgb, var(--dsh-ri-success) 28%, var(--dsh-ri-border));
  color: var(--dsh-ri-success);
  background: color-mix(in srgb, var(--dsh-ri-success) 6%, var(--dsh-ri-bg));
}

.dsh-ri-source-pill.is-degraded {
  border-color: color-mix(in srgb, var(--dsh-ri-warning) 26%, var(--dsh-ri-border));
  color: var(--dsh-ri-warning);
  background: color-mix(in srgb, var(--dsh-ri-warning) 5%, var(--dsh-ri-bg));
}

.dsh-ri-action-pill.is-disabled {
  border-color: var(--dsh-ri-border);
  color: var(--dsh-ri-label-tertiary);
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-action-pill.is-external {
  border-color: color-mix(in srgb, var(--dsh-ri-danger) 28%, var(--dsh-ri-border));
  color: var(--dsh-ri-danger);
  background: color-mix(in srgb, var(--dsh-ri-danger) 6%, var(--dsh-ri-bg));
}

.dsh-ri-source-signal {
  display: inline-flex;
  flex: 0 0 auto;
}

.dsh-ri-detail-column {
  padding: 18px 18px 28px;
}

.dsh-ri-detail-head {
  align-items: flex-start;
  flex-wrap: wrap;
}

.dsh-ri-detail-identity {
  flex: 1 1 280px;
  gap: 11px;
}

.dsh-ri-detail-head-copy {
  min-width: 0;
}

.dsh-ri-detail-toolchain {
  margin-bottom: 2px;
  color: var(--dsh-ri-label-secondary);
  font-size: var(--dsh-ri-type-meta);
  font-weight: 650;
}

.dsh-ri-detail-port {
  font-size: var(--dsh-ri-type-detail-port);
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.dsh-ri-detail-subline {
  overflow: hidden;
  margin-top: 2px;
  color: var(--dsh-ri-label-secondary);
  font-size: var(--dsh-ri-type-meta);
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-detail-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 5px;
}

.dsh-ri-detail-section {
  margin-top: 16px;
}

.dsh-ri-section-title {
  margin: 0 0 7px;
  color: var(--dsh-ri-label-tertiary);
  font-size: var(--dsh-ri-type-meta);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.35;
}

.dsh-ri-panel:lang(zh) .dsh-ri-section-title {
  letter-spacing: 0;
  text-transform: none;
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
  padding: 9px 11px 10px;
  background: var(--dsh-ri-bg);
}

.dsh-ri-fact.is-wide {
  grid-column: 1 / -1;
}

.dsh-ri-fact dt {
  margin-bottom: 2px;
  color: var(--dsh-ri-label-tertiary);
  font-size: var(--dsh-ri-type-caption);
  line-height: 1.4;
}

.dsh-ri-fact dd {
  overflow: hidden;
  margin: 0;
  color: var(--dsh-ri-label-secondary);
  font-size: var(--dsh-ri-type-label);
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-fact.is-technical dd {
  font-family: var(--dsh-ri-font-mono);
  font-variant-numeric: tabular-nums;
}

.dsh-ri-fact dd.is-multiline {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: var(--dsh-ri-leading-prose);
}

.dsh-ri-source-facts {
  gap: 9px 14px;
  margin-top: 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.dsh-ri-source-facts .dsh-ri-fact {
  padding: 0;
  background: transparent;
}

.dsh-ri-source-card,
.dsh-ri-handling-card {
  padding: 10px 11px;
  border: 1px solid var(--dsh-ri-border);
  border-radius: 8px;
  background: var(--dsh-ri-bg-muted);
}

.dsh-ri-source-card.is-degraded {
  border-color: color-mix(in srgb, var(--dsh-ri-warning) 26%, var(--dsh-ri-border));
  background: color-mix(in srgb, var(--dsh-ri-warning) 4%, var(--dsh-ri-bg));
}

.dsh-ri-source-copy,
.dsh-ri-handling-copy {
  margin: 7px 0 0;
  color: var(--dsh-ri-label-secondary);
  font-size: var(--dsh-ri-type-label);
  line-height: var(--dsh-ri-leading-prose);
}

.dsh-ri-owner-line {
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
  color: var(--dsh-ri-label-secondary);
  font-size: var(--dsh-ri-type-meta);
  line-height: 1.5;
}

.dsh-ri-owner-label {
  color: var(--dsh-ri-label-tertiary);
}

.dsh-ri-owner-pill {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  padding: 3px 7px;
  border-radius: 5px;
  color: var(--dsh-ri-success);
  background: var(--dsh-ri-bg);
  font-size: var(--dsh-ri-type-meta);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-handling-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
}

.dsh-ri-handling-content {
  flex: 1 1 280px;
  min-width: 0;
}

.dsh-ri-primary-action,
.dsh-ri-danger-action,
.dsh-ri-secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 11px;
  border-radius: 7px;
  font-size: var(--dsh-ri-type-control);
  font-weight: 600;
  cursor: pointer;
  line-height: 1.35;
  white-space: nowrap;
}

.dsh-ri-primary-action {
  border: 1px solid var(--dsh-ri-accent);
  color: var(--dsh-ri-bg);
  background: var(--dsh-ri-accent);
}

.dsh-ri-danger-action {
  border: 1px solid var(--dsh-ri-danger);
  color: var(--dsh-ri-bg);
  background: var(--dsh-ri-danger);
}

.dsh-ri-primary-action:hover,
.dsh-ri-danger-action:hover {
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
.dsh-ri-danger-action:focus-visible,
.dsh-ri-secondary-action:focus-visible,
.dsh-ri-scope-option:focus-visible,
.dsh-ri-action-toggle:focus-within {
  border-color: var(--dsh-ri-accent);
  outline: 2px solid color-mix(in srgb, var(--dsh-ri-accent) 24%, transparent);
  outline-offset: 1px;
}

.dsh-ri-primary-action:disabled,
.dsh-ri-danger-action:disabled,
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
  font-size: var(--dsh-ri-type-label);
  font-weight: 600;
}

.dsh-ri-empty-copy {
  max-width: 260px;
  margin: 5px 0 0;
  font-size: var(--dsh-ri-type-control);
  line-height: var(--dsh-ri-leading-prose);
}

.dsh-ri-confirm-backdrop {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--dsh-ri-mask);
  backdrop-filter: var(--dsh-ri-mask-blur);
  -webkit-backdrop-filter: var(--dsh-ri-mask-blur);
}

.dsh-ri-confirm {
  width: min(480px, calc(100% - 48px));
  max-height: 100%;
  overflow: auto;
  padding: 24px;
  border: 0;
  border-radius: 24px;
  background: var(--dsh-ri-bg);
  box-shadow: var(--dsh-ri-shadow);
}

.dsh-ri-confirm-title {
  margin: 0;
  color: var(--dsh-ri-label);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.35;
}

.dsh-ri-confirm-copy {
  margin: 8px 0 0;
  color: var(--dsh-ri-label-secondary);
  font-size: var(--dsh-ri-type-control);
  line-height: var(--dsh-ri-leading-prose);
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
  font-size: var(--dsh-ri-type-label);
  line-height: var(--dsh-ri-leading-prose);
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
  font-size: var(--dsh-ri-type-meta);
}

.dsh-ri-confirm-identity-value {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: var(--dsh-ri-label-secondary);
  font-size: var(--dsh-ri-type-label);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-ri-confirm-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}

@media (max-width: 1040px) {
  .dsh-ri-panel {
    width: calc(100vw - 48px);
  }

  .dsh-ri-toolbar {
    gap: 8px;
  }

  .dsh-ri-search {
    flex: 1 1 100%;
  }

  .dsh-ri-body {
    grid-template-columns: minmax(200px, 0.8fr) minmax(270px, 1.2fr);
  }
}

@media (max-width: 720px) {
  .dsh-ri-panel {
    width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
    height: calc(100vh - 32px);
    border-radius: 20px;
  }

  .dsh-ri-options {
    padding-right: 16px;
    padding-left: 16px;
  }

  .dsh-ri-body {
    display: flex;
    flex-direction: column;
  }

  .dsh-ri-list-column {
    flex: 0 1 40%;
    min-height: 180px;
    overflow-y: auto;
    border-right: 0;
    border-bottom: 1px solid var(--dsh-ri-border-soft);
  }

  .dsh-ri-detail-column {
    flex: 1 1 60%;
    overflow-y: auto;
    padding: 16px 14px 22px;
  }
}

@media (max-width: 480px) {
  .dsh-ri-panel {
    width: calc(100vw - 16px);
    max-width: calc(100vw - 16px);
    height: calc(100vh - 16px);
    border-radius: 16px;
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
  .dsh-ri-handling-card .dsh-ri-danger-action,
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
