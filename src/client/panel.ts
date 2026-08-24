import * as React from 'react'
import type {
  HostActionKind,
  HostActionRequest,
  HostInventorySnapshot,
  HostListenerRow,
  HostOpenDirectoryResult,
} from '../host-ui.js'
import type { RuntimeInspectorBrowserRpc } from './bridge.js'
import {
  buildRuntimeInspectorSessionContext,
  formatProcessCreatedAt,
  type RuntimeInspectorClientSessionsLike,
  type RuntimeInspectorConversationLike,
  type RuntimeInspectorObservableLike,
  type RuntimeInspectorSessionContext,
  type RuntimeInspectorSessionListLike,
} from './session-context.js'
import {
  IconCheck,
  IconChevron,
  IconClose,
  IconCopy,
  IconEmptyLink,
  IconFolder,
  IconInfo,
  IconLinkSignal,
  IconPin,
  IconPulse,
  IconRefresh,
  IconSearch,
} from './icons.js'
import { loadPinnedListenerKeys, savePinnedListenerKeys, togglePinnedListenerKey } from './pinned-listeners.js'
import { ToolchainLogo, toolchainName } from './toolchain-logos.js'

interface SidebarEntryProps {
  readonly wide?: boolean
  readonly onOpen: () => void
  readonly rpc: RuntimeInspectorBrowserRpc
  readonly sessions: RuntimeInspectorClientSessionsLike
}

interface PanelProps {
  readonly rpc: RuntimeInspectorBrowserRpc
  readonly sessions: RuntimeInspectorClientSessionsLike
}

interface PanelState {
  readonly snapshot?: HostInventorySnapshot
  readonly error?: string
  readonly actionResult?: string
  readonly postAction?: boolean
  readonly loading?: boolean
}

type FilterKey = 'all' | 'dsh' | 'unconfirmed' | 'actionable'
type ScopeKey = 'development' | 'all'
type SortKey = 'port' | 'application' | 'pid' | 'project' | 'session'
type SortDirection = 'asc' | 'desc'
type SourceState = 'verified' | 'inferred' | 'unattributed' | 'degraded'

const panelState = {
  open: false,
  listeners: new Set<() => void>(),
}

const EMPTY_SESSION_LIST: RuntimeInspectorSessionListLike = Object.freeze({ byId: Object.freeze({}) })
const EMPTY_CONVERSATION: RuntimeInspectorConversationLike = Object.freeze({ nodes: Object.freeze([]), runningCalls: Object.freeze([]) })
const noopSubscribe = (): (() => void) => () => {}

function useRuntimeInspectorSessionContext(sessions: RuntimeInspectorClientSessionsLike): RuntimeInspectorSessionContext {
  const subscribeList = React.useCallback((listener: () => void) => sessions.list.subscribe(listener), [sessions])
  const readList = React.useCallback(() => sessions.list.getSnapshot() ?? EMPTY_SESSION_LIST, [sessions])
  const list = React.useSyncExternalStore(subscribeList, readList, readList)
  const sessionId = list.current
  const summary = sessionId === undefined ? undefined : list.byId[sessionId]
  let face: RuntimeInspectorObservableLike<RuntimeInspectorConversationLike> | undefined
  try {
    face = sessionId === undefined ? undefined : sessions.binding(sessionId)?.session
  } catch {
    face = undefined
  }
  const subscribeConversation = React.useCallback(
    (listener: () => void) => face?.subscribe(listener) ?? noopSubscribe(),
    [face],
  )
  const readConversation = React.useCallback(() => face?.getSnapshot() ?? EMPTY_CONVERSATION, [face])
  const conversation = React.useSyncExternalStore(subscribeConversation, readConversation, readConversation)
  return React.useMemo(() => buildRuntimeInspectorSessionContext({
    sessionId,
    title: summary?.displayTitle,
    cwd: summary?.cwd,
    conversation,
  }), [conversation, sessionId, summary?.cwd, summary?.displayTitle])
}

function notifyPanelState(): void {
  for (const listener of [...panelState.listeners]) listener()
}

function setPanelOpen(open: boolean): void {
  panelState.open = open
  notifyPanelState()
}

export function openRuntimeInspectorPanel(): void {
  setPanelOpen(true)
}

function usePanelOpen(): boolean {
  const [open, setOpen] = React.useState(panelState.open)
  React.useEffect(() => {
    const listener = (): void => { setOpen(panelState.open) }
    panelState.listeners.add(listener)
    return () => { panelState.listeners.delete(listener) }
  }, [])
  return open
}

function actionLabel(kind: HostActionKind): string {
  switch (kind) {
    case 'managed-shutdown': return '停止 DSH 任务'
    case 'external-single-pid': return '结束该进程'
    case 'read-only':
    case 'degraded':
      return '仅可查看'
  }
}

function modeLabel(snapshot: HostInventorySnapshot): string {
  return snapshot.mode === 'observing' ? '观察模式' : '来源受限'
}

function displayExecutable(executable: string | undefined): string {
  if (executable === undefined || executable.length === 0) return '未识别进程'
  const parts = executable.split(/[\\/]/u)
  return parts[parts.length - 1] || executable
}

function sessionLabel(row: HostListenerRow): string {
  switch (row.sessionVisibility) {
    case 'current-session': return '当前会话'
    case 'another-dsh-session': return '其他 DSH 会话'
    case 'unknown-session': return '会话未确认'
    case 'unattributed': return '来源未确认'
  }
}

/** The current Host DTO has no user-facing title field, so use a truthful contextual fallback. */
function sessionTitle(row: HostListenerRow, context: RuntimeInspectorSessionContext): string {
  if (row.sessionVisibility === 'current-session'
    && row.session?.sessionId === context.sessionId
    && context.title !== undefined) return context.title
  switch (row.sessionVisibility) {
    case 'current-session': return '当前 DSH 会话'
    case 'another-dsh-session': return '另一个 DSH 会话'
    case 'unknown-session': return 'DSH 会话未确认'
    case 'unattributed': return '未关联 DSH 会话'
  }
}

/** Resolve the actual current-Session user request that initiated this call. */
function requestSummary(row: HostListenerRow, context: RuntimeInspectorSessionContext): string {
  return context.requestFor({
    sessionId: row.session?.sessionId,
    callId: row.session?.callId,
    rootCallId: row.session?.rootCallId,
    turn: row.session?.turn,
  }) ?? '未提供'
}

function projectSummary(row: HostListenerRow, context: RuntimeInspectorSessionContext): string {
  if (row.project !== undefined && row.project.length > 0) return row.project
  if (row.sessionVisibility === 'current-session' && row.session?.sessionId === context.sessionId) {
    return context.cwd ?? '未关联项目'
  }
  return '未关联项目'
}

function callId(row: HostListenerRow): string {
  return row.session?.callId ?? '未提供'
}

function isActionable(row: HostListenerRow): boolean {
  return row.action.available
    && (row.action.kind === 'managed-shutdown' || row.action.kind === 'external-single-pid')
}

function isCurrentSessionVerified(row: HostListenerRow): boolean {
  return row.confidence === 'verified' && row.sessionVisibility === 'current-session'
}

function sourceState(row: HostListenerRow, snapshot: HostInventorySnapshot): SourceState {
  if (snapshot.mode === 'read-only-degraded') return 'degraded'
  return row.confidence
}

function sourceLabel(source: SourceState): string {
  switch (source) {
    case 'verified': return 'DSH 来源已确认'
    case 'inferred':
    case 'unattributed':
      return '来源未确认'
    case 'degraded': return '来源追踪暂不可用'
  }
}

function sourceDescription(row: HostListenerRow, snapshot: HostInventorySnapshot): string {
  switch (sourceState(row, snapshot)) {
    case 'verified':
      return row.sessionVisibility === 'current-session'
        ? 'DSH 已将此监听端口与当前会话中的生命周期关联。'
        : 'DSH 已确认这个监听端口的来源，但它属于另一个 DSH 会话。'
    case 'inferred':
      return '发现 DSH 线索，但现有证据不足以确认来源归属。'
    case 'unattributed':
      return '当前扫描未找到 DSH 关联。'
    case 'degraded':
      return '来源追踪当前不可用；这里的状态不代表单个进程已经完成来源判断。'
  }
}

function handlingDescription(row: HostListenerRow, snapshot: HostInventorySnapshot): string {
  if (!snapshot.scanComplete) {
    return '本次监听扫描未完成，当前结果仅用于查看。'
  }
  if (snapshot.mode === 'read-only-degraded' && row.action.kind !== 'external-single-pid') {
    return '来源追踪暂不可用，此监听端口当前仅用于查看。'
  }
  switch (row.action.kind) {
    case 'managed-shutdown':
      return '通过 DSH 生命周期执行停止；Host 会在执行前重新校验当前身份。'
    case 'external-single-pid':
      return '此操作与 DSH 来源归因无关；执行前会重新校验 PID、创建时间、可执行文件和监听端口。'
    case 'read-only':
      return row.action.reason === 'identity-incomplete'
        ? '进程身份信息不足，系统不会执行结束操作。'
        : '当前监听端口仅提供查看。'
    case 'degraded':
      return '当前环境只允许查看，系统不会执行进程操作。'
  }
}

function sourceIcon(source: SourceState): React.ReactNode {
  switch (source) {
    case 'verified': return IconCheck({ size: 12 })
    case 'inferred': return IconLinkSignal({ size: 13 })
    case 'unattributed': return IconEmptyLink({ size: 13 })
    case 'degraded': return IconInfo({ size: 13 })
  }
}

function SourcePill({ row, snapshot }: { readonly row: HostListenerRow; readonly snapshot: HostInventorySnapshot }): React.ReactNode {
  const source = sourceState(row, snapshot)
  return React.createElement('span', {
    className: `dsh-ri-source-pill is-${source}`,
    'data-runtime-inspector-confidence': row.confidence,
    title: source === 'inferred' ? '发现 DSH 线索，来源尚未确认' : sourceDescription(row, snapshot),
  },
  React.createElement('span', { className: 'dsh-ri-source-signal' }, sourceIcon(source)),
  React.createElement('span', null, sourceLabel(source)),
  )
}

function ActionPill({ row }: { readonly row: HostListenerRow }): React.ReactNode {
  const disabled = !isActionable(row)
  const tone = disabled ? 'is-disabled' : row.action.kind === 'managed-shutdown' ? 'is-managed' : 'is-external'
  return React.createElement('span', { className: `dsh-ri-action-pill ${tone}` }, actionLabel(row.action.kind))
}

function sortRows(rows: readonly HostListenerRow[], key: SortKey, direction: SortDirection): HostListenerRow[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    const value = (row: HostListenerRow): string | number => {
      switch (key) {
        case 'port': return row.port
        case 'pid': return row.pid
        case 'application': return row.executable ?? row.session?.tool ?? ''
        case 'project': return row.project ?? ''
        case 'session': return row.sessionVisibility
      }
    }
    const leftValue = value(left)
    const rightValue = value(right)
    if (leftValue < rightValue) return -factor
    if (leftValue > rightValue) return factor
    return 0
  })
}

function rowSearchText(row: HostListenerRow): string {
  return [
    row.port,
    row.pid,
    row.address,
    row.executable,
    row.project,
    row.sessionVisibility,
    row.confidence,
    row.session?.sessionId,
    row.session?.agentId,
    row.session?.tool,
    row.session?.command,
    row.session?.callId,
  ].filter(value => value !== undefined).join(' ').toLowerCase()
}

function filteredRows(
  rows: readonly HostListenerRow[],
  search: string,
  filter: FilterKey,
): HostListenerRow[] {
  const query = search.trim().toLowerCase()
  return rows.filter(row => {
    if (query.length > 0 && !rowSearchText(row).includes(query)) return false
    switch (filter) {
      case 'dsh': return row.confidence === 'verified'
      case 'unconfirmed': return row.confidence !== 'verified'
      case 'actionable': return isActionable(row)
      case 'all': return true
    }
  })
}

function openDirectoryResultMessage(result: HostOpenDirectoryResult): string {
  if (result.ok) return '已打开项目目录。'
  switch (result.reason) {
    case 'listener-not-found': return '监听器已不存在，请刷新后重试。'
    case 'project-unavailable': return '项目目录不可用。'
    case 'opener-unavailable': return '当前环境不支持打开项目目录。'
    case 'open-failed': return result.error ?? '打开项目目录失败。'
    default: return result.error ?? '打开项目目录失败。'
  }
}

function Metric({ label, value }: { readonly label: string; readonly value: number | string }): React.ReactNode {
  return React.createElement('div', { className: 'dsh-ri-summary-item' },
    React.createElement('span', { className: 'dsh-ri-summary-value' }, String(value)),
    React.createElement('span', { className: 'dsh-ri-summary-label' }, label),
  )
}

function ListenerRow({
  row,
  snapshot,
  selected,
  pinned,
  onSelect,
  onTogglePin,
}: {
  readonly row: HostListenerRow
  readonly snapshot: HostInventorySnapshot
  readonly selected: boolean
  readonly pinned: boolean
  readonly onSelect: (listenerId: string) => void
  readonly onTogglePin: (row: HostListenerRow) => void
}): React.ReactNode {
  const toolchain = row.development.toolchain
  const name = toolchainName(toolchain)
  const executable = displayExecutable(row.executable ?? row.session?.tool)
  return React.createElement('li', {
    className: 'dsh-ri-row',
    'data-runtime-inspector-row': row.listenerId,
    'data-runtime-inspector-selected': selected ? 'true' : 'false',
  },
  React.createElement('button', {
    type: 'button',
    className: `dsh-ri-row-button${selected ? ' is-selected' : ''}${row.development.group === 'other' ? ' has-pin' : ''}`,
    'aria-label': `选择端口 ${String(row.port)}，PID ${String(row.pid)}`,
    'aria-pressed': selected,
    'data-runtime-inspector-select': row.listenerId,
    onClick: () => { onSelect(row.listenerId) },
  },
  React.createElement('div', { className: 'dsh-ri-row-top' },
    React.createElement('span', { className: 'dsh-ri-port' },
      `端口 ${String(row.port)}`,
      React.createElement('span', { className: 'dsh-ri-protocol' }, row.protocol),
    ),
    React.createElement(SourcePill, { row, snapshot }),
  ),
  React.createElement('div', { className: 'dsh-ri-toolchain-line' },
    React.createElement(ToolchainLogo, { toolchain, size: 'compact' }),
    React.createElement('div', { className: 'dsh-ri-toolchain-copy' },
      name === undefined ? null : React.createElement('span', { className: 'dsh-ri-toolchain-name' }, name),
      React.createElement('span', {
        className: 'dsh-ri-executable',
        title: row.executable ?? row.session?.tool ?? '未识别进程',
      }, executable),
    ),
  ),
  React.createElement('div', { className: 'dsh-ri-row-meta' },
    React.createElement('span', null, `PID ${String(row.pid)}`),
    React.createElement('span', null, sessionLabel(row)),
    React.createElement(ActionPill, { row }),
  ),
  ),
  row.development.group !== 'other' ? null : React.createElement('button', {
    type: 'button',
    className: `dsh-ri-pin-button${pinned ? ' is-pinned' : ''}`,
    'aria-label': pinned ? `取消固定端口 ${String(row.port)}` : `固定显示端口 ${String(row.port)}`,
    'aria-pressed': pinned,
    'data-runtime-inspector-pin': row.development.stableKey,
    title: pinned ? '取消固定显示' : '固定显示',
    onClick: () => { onTogglePin(row) },
  }, IconPin({ size: 14 })),
  )
}

function Fact({
  label,
  value,
  wide = false,
  multiline = false,
}: {
  readonly label: string
  readonly value: string
  readonly wide?: boolean
  readonly multiline?: boolean
}): React.ReactNode {
  return React.createElement('div', { className: `dsh-ri-fact${wide ? ' is-wide' : ''}` },
    React.createElement('dt', null, label),
    React.createElement('dd', { className: multiline ? 'is-multiline' : undefined, title: value }, value),
  )
}

function DetailPanel({
  row,
  snapshot,
  pending,
  onCopy,
  onOpenDirectory,
  onRequest,
  sessionContext,
}: {
  readonly row: HostListenerRow | undefined
  readonly snapshot: HostInventorySnapshot
  readonly pending: HostActionRequest | undefined
  readonly onCopy: (row: HostListenerRow) => void
  readonly onOpenDirectory: (row: HostListenerRow) => void
  readonly onRequest: (request: HostActionRequest) => void
  readonly sessionContext: RuntimeInspectorSessionContext
}): React.ReactNode {
  if (row === undefined) {
    return React.createElement('div', { className: 'dsh-ri-empty' },
      React.createElement('div', null,
        React.createElement('span', { className: 'dsh-ri-state-icon' }, IconPulse({ size: 23 })),
        React.createElement('div', { className: 'dsh-ri-empty-title' }, snapshot.listeners.length === 0 ? '当前没有监听端口' : '选择一个监听端口'),
        React.createElement('p', { className: 'dsh-ri-empty-copy' }, snapshot.listeners.length === 0
          ? '刷新后会重新读取当前 DSH 会话可见的监听状态。'
          : '从左侧列表选择一项，在这里查看来源、会话和处理方式。'),
      ),
    )
  }

  const actionDisabled = pending !== undefined
  const source = sourceState(row, snapshot)
  const actionAvailable = isActionable(row)
  const projectAvailable = row.project !== undefined && row.project.length > 0
  const toolchain = row.development.toolchain
  const name = toolchainName(toolchain)
  const detailAction = actionAvailable
    ? React.createElement('button', {
      type: 'button',
      className: 'dsh-ri-primary-action',
      'aria-label': `${actionLabel(row.action.kind)}：端口 ${String(row.port)}`,
      'data-runtime-inspector-action': row.action.kind,
      disabled: actionDisabled,
      onClick: () => { onRequest({ listenerId: row.listenerId, kind: row.action.kind }) },
    }, actionLabel(row.action.kind))
    : React.createElement('button', {
      type: 'button',
      className: 'dsh-ri-secondary-action',
      'aria-label': '当前监听端口仅可查看',
      'data-runtime-inspector-action': 'unavailable',
      disabled: true,
    }, '仅可查看')

  return React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'dsh-ri-detail-head' },
      React.createElement('div', { className: 'dsh-ri-detail-identity' },
        React.createElement(ToolchainLogo, { toolchain, size: 'detail' }),
        React.createElement('div', { className: 'dsh-ri-detail-head-copy' },
          name === undefined ? null : React.createElement('div', { className: 'dsh-ri-detail-toolchain' }, name),
          React.createElement('div', { className: 'dsh-ri-detail-port' },
            `端口 ${String(row.port)}`,
            React.createElement('span', { className: 'dsh-ri-protocol' }, row.protocol),
          ),
          React.createElement('div', { className: 'dsh-ri-detail-subline', title: row.executable ?? row.session?.tool ?? '' },
            `${displayExecutable(row.executable ?? row.session?.tool)} · PID ${String(row.pid)}`,
          ),
        ),
      ),
      React.createElement('div', { className: 'dsh-ri-detail-actions' },
        React.createElement('button', {
          type: 'button',
          className: 'dsh-ri-icon-button',
          'aria-label': `复制端口 ${String(row.port)} 详情`,
          'data-runtime-inspector-copy': row.listenerId,
          disabled: actionDisabled,
          onClick: () => { onCopy(row) },
        }, IconCopy({ size: 15 })),
        React.createElement('button', {
          type: 'button',
          className: 'dsh-ri-icon-button',
          'aria-label': `打开端口 ${String(row.port)} 项目目录`,
          'data-runtime-inspector-open-directory': row.listenerId,
          disabled: actionDisabled || !projectAvailable,
          onClick: () => { onOpenDirectory(row) },
        }, IconFolder({ size: 15 })),
      ),
    ),
    React.createElement('section', { className: 'dsh-ri-detail-section' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, '运行信息'),
      React.createElement('dl', { className: 'dsh-ri-fact-grid' },
        React.createElement(Fact, { label: '应用', value: row.executable ?? row.session?.tool ?? '未获取', wide: true, multiline: true }),
        React.createElement(Fact, { label: 'PID', value: String(row.pid) }),
        React.createElement(Fact, { label: '监听地址', value: `${row.address}:${String(row.port)}` }),
        React.createElement(Fact, { label: '创建时间', value: formatProcessCreatedAt(row.processCreatedAt), multiline: true }),
        React.createElement(Fact, { label: '项目目录', value: projectSummary(row, sessionContext), wide: true, multiline: true }),
      ),
    ),
    React.createElement('section', { className: 'dsh-ri-detail-section' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, '会话上下文'),
      React.createElement('dl', { className: 'dsh-ri-fact-grid' },
        React.createElement(Fact, { label: 'Session', value: sessionTitle(row, sessionContext) }),
        React.createElement(Fact, { label: 'Call ID', value: callId(row), multiline: true }),
        React.createElement(Fact, { label: '用户请求', value: requestSummary(row, sessionContext), wide: true, multiline: true }),
      ),
    ),
    React.createElement('section', { className: 'dsh-ri-detail-section' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, '来源'),
      React.createElement('div', { className: `dsh-ri-source-card${source === 'degraded' ? ' is-degraded' : ''}` },
        React.createElement(SourcePill, { row, snapshot }),
        React.createElement('p', { className: 'dsh-ri-source-copy' }, sourceDescription(row, snapshot)),
        row.lifecycleOwner === undefined ? null : React.createElement('div', { className: 'dsh-ri-owner-line' },
          React.createElement('span', { className: 'dsh-ri-owner-label' }, 'DSH 生命周期'),
          React.createElement('span', { className: 'dsh-ri-owner-pill' }, `${row.lifecycleOwner.kind} · ${row.lifecycleOwner.id}`),
        ),
      ),
    ),
    React.createElement('section', { className: 'dsh-ri-detail-section' },
      React.createElement('h3', { className: 'dsh-ri-section-title' }, '处理方式'),
      React.createElement('div', { className: `dsh-ri-handling-card${actionAvailable ? '' : ' is-disabled'}` },
        React.createElement('div', { className: 'dsh-ri-handling-content' },
          React.createElement('div', { className: 'dsh-ri-action-line' }, React.createElement(ActionPill, { row })),
          React.createElement('p', { className: 'dsh-ri-handling-copy' }, handlingDescription(row, snapshot)),
        ),
        detailAction,
      ),
    ),
  )
}

function identityItem(label: string, value: string): React.ReactNode {
  return React.createElement('div', { className: 'dsh-ri-confirm-identity-item' },
    React.createElement('span', { className: 'dsh-ri-confirm-identity-label' }, label),
    React.createElement('span', { className: 'dsh-ri-confirm-identity-value', title: value }, value),
  )
}

function ConfirmDialog({
  row,
  request,
  onConfirm,
  onCancel,
}: {
  readonly row: HostListenerRow
  readonly request: HostActionRequest
  readonly onConfirm: () => void
  readonly onCancel: () => void
}): React.ReactNode {
  const external = request.kind === 'external-single-pid'
  const title = external ? '确认结束该进程' : '确认停止 DSH 任务'
  return React.createElement('div', {
    className: 'dsh-ri-confirm-backdrop',
    role: 'presentation',
    onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onCancel()
    },
  },
  React.createElement('section', {
    className: 'dsh-ri-confirm',
    role: 'alertdialog',
    'aria-modal': true,
    'aria-labelledby': 'dsh-runtime-inspector-confirm-title',
    'data-runtime-inspector-confirmation': 'dialog',
  },
  React.createElement('h2', { className: 'dsh-ri-confirm-title', id: 'dsh-runtime-inspector-confirm-title' }, title),
  React.createElement('p', { className: 'dsh-ri-confirm-copy' }, external
    ? '这会直接处理一个系统进程，与 DSH 来源判断无关。执行前 Host 会重新校验进程身份。'
    : '这会通过 DSH 生命周期停止当前任务。执行前 Host 会重新校验当前归属。'),
  external ? React.createElement('div', { className: 'dsh-ri-confirm-note' },
    IconInfo({ size: 15 }),
    React.createElement('span', null, '请确认下面的 PID、创建时间和可执行文件仍与当前目标一致。'),
  ) : null,
  React.createElement('div', { className: 'dsh-ri-confirm-identity' },
    identityItem('监听端口', `${row.address}:${String(row.port)}`),
    identityItem('PID', String(row.pid)),
    identityItem('创建时间', formatProcessCreatedAt(row.processCreatedAt)),
    identityItem('可执行文件', row.executable ?? '不可用'),
    external ? null : identityItem('DSH 生命周期', row.lifecycleOwner === undefined ? '不可用' : `${row.lifecycleOwner.kind} · ${row.lifecycleOwner.id}`),
  ),
  React.createElement('div', { className: 'dsh-ri-confirm-actions' },
    React.createElement('button', { type: 'button', className: 'dsh-ri-secondary-action', 'data-runtime-inspector-confirm': 'cancel', onClick: onCancel }, '取消'),
    React.createElement('button', { type: 'button', className: 'dsh-ri-primary-action', 'data-runtime-inspector-confirm': 'confirm', onClick: onConfirm }, title),
  ),
  ),
  )
}

function SidebarEntry({ wide = true, onOpen, rpc, sessions }: SidebarEntryProps): React.ReactNode {
  const sessionContext = useRuntimeInspectorSessionContext(sessions)
  const [count, setCount] = React.useState<number>()
  React.useEffect(() => {
    void rpc.inventory({
      ...sessionContext.sessionId === undefined ? {} : { currentSessionId: sessionContext.sessionId },
      ...sessionContext.cwd === undefined ? {} : { currentProject: sessionContext.cwd },
    }).then(snapshot => {
      if (snapshot.mode === 'read-only-degraded') {
        setCount(undefined)
        return
      }
      setCount(snapshot.listeners.filter(isCurrentSessionVerified).length)
    }, () => { setCount(undefined) })
  }, [rpc, sessionContext.cwd, sessionContext.sessionId])

  const countLabel = count === undefined ? '—' : count > 99 ? '99+' : String(count)
  const indicator = `（${countLabel}）`
  const accessibleLabel = count === undefined
    ? '当前会话已确认监听端口数量暂不可用'
    : `当前会话已确认监听端口 ${String(count)}`
  return React.createElement('button', {
    type: 'button',
    className: `dsh-ri-entry${wide ? '' : ' is-compact'}`,
    title: wide ? 'Runtime Inspector' : `Runtime Inspector ${indicator}`,
    'aria-label': `打开 Runtime Inspector，${accessibleLabel}`,
    'data-runtime-inspector-entry': 'open',
    onClick: onOpen,
  },
  React.createElement('span', { className: 'dsh-ri-entry-icon' }, IconPulse({ size: 16 })),
  wide ? React.createElement(React.Fragment, null,
    React.createElement('span', { className: 'dsh-ri-entry-label' }, '监听端口'),
    React.createElement('span', { className: 'dsh-ri-entry-badge' }, indicator),
  ) : null,
  )
}

function RuntimeInspectorPanel({ rpc, sessions }: PanelProps): React.ReactNode {
  const sessionContext = useRuntimeInspectorSessionContext(sessions)
  const open = usePanelOpen()
  const [state, setState] = React.useState<PanelState>({})
  const [search, setSearch] = React.useState('')
  const [filter, setFilter] = React.useState<FilterKey>('all')
  const [scope, setScope] = React.useState<ScopeKey>('development')
  const [otherOpen, setOtherOpen] = React.useState(false)
  const [pinnedKeys, setPinnedKeys] = React.useState<ReadonlySet<string>>(() => loadPinnedListenerKeys())
  const [sortKey, setSortKey] = React.useState<SortKey>('port')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc')
  const [selectedListenerId, setSelectedListenerId] = React.useState<string>()
  const [pending, setPending] = React.useState<HostActionRequest>()

  const refresh = React.useCallback((): void => {
    setState(previous => ({ ...previous, error: undefined, actionResult: undefined, loading: true }))
    void rpc.inventory({
      ...sessionContext.sessionId === undefined ? {} : { currentSessionId: sessionContext.sessionId },
      ...sessionContext.cwd === undefined ? {} : { currentProject: sessionContext.cwd },
    }).then(
      snapshot => { setState({ snapshot, loading: false }) },
      error => {
        setState(previous => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        }))
      },
    )
  }, [rpc, sessionContext.cwd, sessionContext.sessionId])

  React.useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  React.useEffect(() => {
    const rows = state.snapshot?.listeners ?? []
    setSelectedListenerId(previous => previous !== undefined && rows.some(row => row.listenerId === previous)
      ? previous
      : rows.find(row => row.development.group === 'current-project')?.listenerId ?? rows[0]?.listenerId)
    if (pending !== undefined && !rows.some(row => row.listenerId === pending.listenerId)) setPending(undefined)
  }, [state.snapshot, pending])

  if (!open) return null

  const snapshot = state.snapshot
  const allRows = snapshot?.listeners ?? []
  const rows = snapshot === undefined ? [] : sortRows(filteredRows(allRows, search, filter), sortKey, sortDirection)
  const searching = search.trim().length > 0
  const currentProjectRows = rows.filter(row => row.development.group === 'current-project')
  const developmentEnvironmentRows = rows.filter(row => row.development.group === 'development-environment')
  const pinnedRows = rows.filter(row => row.development.group === 'other' && pinnedKeys.has(row.development.stableKey))
  const otherRows = rows.filter(row => row.development.group === 'other' && !pinnedKeys.has(row.development.stableKey))
  const showOtherRows = scope === 'all' || otherOpen || searching
  const visibleRows = [
    ...currentProjectRows,
    ...developmentEnvironmentRows,
    ...pinnedRows,
    ...(showOtherRows ? otherRows : []),
  ]
  const selectedRow = visibleRows.find(row => row.listenerId === selectedListenerId) ?? visibleRows[0]
  const actionableCount = allRows.filter(isActionable).length
  const readOnlyCount = allRows.length - actionableCount
  const sessionConfirmedCount: number | string = snapshot?.mode === 'read-only-degraded'
    ? '—'
    : allRows.filter(isCurrentSessionVerified).length
  const developmentCount = allRows.filter(row => row.development.group !== 'other').length

  const togglePin = (row: HostListenerRow): void => {
    setPinnedKeys(previous => {
      const next = togglePinnedListenerKey(previous, row.development.stableKey)
      savePinnedListenerKeys(undefined, next)
      return next
    })
  }

  const listenerRows = (groupRows: readonly HostListenerRow[]): React.ReactNode => React.createElement('ul', {
    className: 'dsh-ri-list',
    'data-runtime-inspector-list': 'listeners',
  }, groupRows.map(row => React.createElement(ListenerRow, {
    key: row.listenerId,
    row,
    snapshot: snapshot as HostInventorySnapshot,
    selected: selectedRow?.listenerId === row.listenerId,
    pinned: pinnedKeys.has(row.development.stableKey),
    onSelect: setSelectedListenerId,
    onTogglePin: togglePin,
  })))

  const copyDetails = (row: HostListenerRow): void => {
    void rpc.copyDetails({ listenerId: row.listenerId }).then(result => {
      setState(previous => ({
        ...previous,
        actionResult: result.ok && result.copied
          ? '详情已复制。'
          : result.ok ? '详情已生成，但剪贴板不可用。' : result.error ?? '复制失败。',
      }))
    }, error => {
      setState(previous => ({ ...previous, error: error instanceof Error ? error.message : String(error) }))
    })
  }

  const openDirectory = (row: HostListenerRow): void => {
    void rpc.openProjectDirectory({ listenerId: row.listenerId }).then(result => {
      setState(previous => ({ ...previous, actionResult: openDirectoryResultMessage(result) }))
    }, error => {
      setState(previous => ({ ...previous, error: error instanceof Error ? error.message : String(error) }))
    })
  }

  const confirmAction = (): void => {
    if (pending === undefined) return
    const request = {
      ...pending,
      confirmed: true,
      ...sessionContext.sessionId === undefined ? {} : { currentSessionId: sessionContext.sessionId },
    }
    setPending(undefined)
    setState(previous => ({ ...previous, loading: true, error: undefined }))
    void rpc.performAction(request).then(
      result => { setState({ snapshot: result.freshScan, actionResult: result.message, postAction: true, loading: false }) },
      error => {
        setState(previous => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        }))
      },
    )
  }

  const pendingRow = pending === undefined ? undefined : allRows.find(row => row.listenerId === pending.listenerId)

  return React.createElement('div', {
    className: 'dsh-ri-overlay',
    role: 'presentation',
    'data-runtime-inspector-panel': 'overlay',
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && pending === undefined) setPanelOpen(false)
    },
  },
  React.createElement('section', {
    className: 'dsh-ri-panel',
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': 'dsh-runtime-inspector-title',
    'data-runtime-inspector-surface': 'panel',
  },
  React.createElement('header', { className: 'dsh-ri-header' },
    React.createElement('div', { className: 'dsh-ri-title-wrap' },
      React.createElement('h2', { className: 'dsh-ri-title', id: 'dsh-runtime-inspector-title' }, 'Runtime Inspector'),
      snapshot === undefined ? null : React.createElement('div', { className: 'dsh-ri-title-meta' },
        React.createElement('span', {
          className: `dsh-ri-mode${snapshot.mode === 'observing' ? '' : ' is-limited'}`,
          'data-runtime-inspector-state': snapshot.scanComplete ? 'ready' : 'incomplete',
        },
          React.createElement('span', { className: 'dsh-ri-mode-dot' }),
          modeLabel(snapshot),
        ),
        snapshot.scanComplete ? null : React.createElement('span', { className: 'dsh-ri-mode is-limited' }, '扫描未完成'),
      ),
    ),
    React.createElement('button', {
      type: 'button',
      className: 'dsh-ri-close',
      'aria-label': '关闭 Runtime Inspector',
      'data-runtime-inspector-close': 'close',
      onClick: () => { setPending(undefined); setPanelOpen(false) },
    }, IconClose({ size: 16 })),
  ),
  snapshot === undefined && state.error === undefined
    ? React.createElement('div', { className: 'dsh-ri-state', 'data-runtime-inspector-state': 'loading' },
      React.createElement('div', null,
        React.createElement('span', { className: 'dsh-ri-state-icon' }, IconRefresh({ size: 23 })),
        React.createElement('div', { className: 'dsh-ri-empty-title' }, '正在读取监听端口'),
      ),
    )
    : null,
  state.error !== undefined
    ? React.createElement('div', { className: 'dsh-ri-error', role: 'alert', 'data-runtime-inspector-state': 'failure' },
      IconInfo({ size: 15 }),
      React.createElement('span', null, snapshot === undefined ? `面板暂不可用，只读：${state.error}` : `刷新未完成：${state.error}`),
    )
    : null,
  snapshot === undefined ? null : React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'dsh-ri-summary', 'aria-label': '监听端口摘要' },
      React.createElement(Metric, { label: '开发端口', value: developmentCount }),
      React.createElement(Metric, { label: '可处理', value: actionableCount }),
      React.createElement(Metric, { label: '仅可查看', value: readOnlyCount }),
      React.createElement(Metric, { label: '本会话已确认', value: sessionConfirmedCount }),
    ),
    React.createElement('div', { className: 'dsh-ri-toolbar', 'data-runtime-inspector-toolbar': 'controls' },
      React.createElement('label', { className: 'dsh-ri-search' },
        React.createElement('span', { className: 'dsh-ri-search-icon' }, IconSearch({ size: 15 })),
        React.createElement('input', {
          type: 'search',
          value: search,
          placeholder: '搜索端口、PID、应用或会话',
          'aria-label': '搜索占用端口',
          'data-runtime-inspector-search': 'input',
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setSearch(event.target.value) },
        }),
      ),
      React.createElement('select', {
        className: 'dsh-ri-select',
        value: sortKey,
        'aria-label': '排序占用端口',
        'data-runtime-inspector-sort': 'select',
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => { setSortKey(event.target.value as SortKey) },
      },
      React.createElement('option', { value: 'port' }, '按端口'),
      React.createElement('option', { value: 'application' }, '按应用'),
      React.createElement('option', { value: 'pid' }, '按 PID'),
      React.createElement('option', { value: 'project' }, '按项目'),
      React.createElement('option', { value: 'session' }, '按会话'),
      ),
      React.createElement('button', {
        type: 'button',
        className: 'dsh-ri-toolbar-button',
        'aria-label': '切换排序方向',
        'data-runtime-inspector-sort-direction': 'toggle',
        onClick: () => { setSortDirection(previous => previous === 'asc' ? 'desc' : 'asc') },
      }, sortDirection === 'asc' ? '升序' : '降序', React.createElement('span', null, IconChevron({ size: 13 }))),
      React.createElement('button', {
        type: 'button',
        className: 'dsh-ri-toolbar-button',
        'aria-label': '刷新端口列表',
        'data-runtime-inspector-refresh': 'refresh',
        disabled: state.loading === true,
        onClick: refresh,
      }, IconRefresh({ size: 14 }), '刷新'),
      React.createElement('div', { className: 'dsh-ri-scope-row', role: 'tablist', 'aria-label': '监听范围' },
        ([
          ['development', '开发端口'],
          ['all', '全部监听'],
        ] as const).map(([key, label]) => React.createElement('button', {
          key,
          type: 'button',
          className: `dsh-ri-filter${scope === key ? ' is-active' : ''}`,
          role: 'tab',
          'aria-selected': scope === key,
          'data-runtime-inspector-scope': key,
          onClick: () => { setScope(key); setOtherOpen(key === 'all') },
        }, label)),
      ),
      React.createElement('div', { className: 'dsh-ri-filter-row', role: 'tablist', 'aria-label': '端口筛选' },
        ([
          ['all', '全部'],
          ['dsh', 'DSH 已确认'],
          ['unconfirmed', '来源未确认'],
          ['actionable', '可处理'],
        ] as const).map(([key, label]) => React.createElement('button', {
          key,
          type: 'button',
          className: `dsh-ri-filter${filter === key ? ' is-active' : ''}`,
          role: 'tab',
          'aria-selected': filter === key,
          onClick: () => { setFilter(key) },
        }, label)),
      ),
    ),
    state.loading === true ? React.createElement('div', { className: 'dsh-ri-banner', role: 'status' }, IconRefresh({ size: 14 }), '正在更新端口状态…') : null,
    snapshot.mode === 'read-only-degraded' ? React.createElement('div', { className: 'dsh-ri-banner is-limited', role: 'status' }, IconInfo({ size: 14 }), '来源追踪暂不可用；可处理项仍会基于进程身份独立校验。') : null,
    !snapshot.scanComplete && snapshot.mode !== 'read-only-degraded' ? React.createElement('div', { className: 'dsh-ri-banner is-limited', role: 'status', 'data-runtime-inspector-state': 'incomplete' }, IconInfo({ size: 14 }), '本次监听扫描未完成，当前结果仅可查看。') : null,
    snapshot.truncated ? React.createElement('div', { className: 'dsh-ri-banner', role: 'status' }, IconInfo({ size: 14 }), '结果数量已达到上限，列表显示当前可见部分。') : null,
    state.actionResult === undefined ? null : React.createElement('div', {
      className: 'dsh-ri-result',
      role: 'status',
      'data-runtime-inspector-state': state.postAction === true ? 'post-action' : 'result',
      'data-runtime-inspector-action-result': 'result',
    }, IconCheck({ size: 14 }), state.actionResult),
    React.createElement('div', { className: 'dsh-ri-body' },
      React.createElement('section', { className: 'dsh-ri-list-column', 'aria-label': '监听端口列表' },
        React.createElement('div', { className: 'dsh-ri-column-heading' },
          React.createElement('span', null, '开发端口'),
          React.createElement('span', { className: 'dsh-ri-column-heading-count' }, `${String(developmentCount)} 项`),
        ),
        rows.length === 0
          ? React.createElement('div', { className: 'dsh-ri-state', 'data-runtime-inspector-state': 'empty' },
            React.createElement('div', null,
              React.createElement('span', { className: 'dsh-ri-state-icon' }, IconSearch({ size: 23 })),
              React.createElement('div', { className: 'dsh-ri-empty-title' }, allRows.length === 0 ? '没有发现监听端口' : '没有匹配项'),
              React.createElement('p', { className: 'dsh-ri-empty-copy' }, allRows.length === 0 ? '当前 DSH 会话没有可显示的监听端口。' : '调整搜索词或筛选条件后重试。'),
            ),
          )
          : React.createElement(React.Fragment, null,
            currentProjectRows.length === 0 ? null : React.createElement('div', {
              className: 'dsh-ri-list-group',
              'data-runtime-inspector-group': 'current-project',
            },
            React.createElement('div', { className: 'dsh-ri-list-group-heading' },
              React.createElement('span', null, '当前项目'),
              React.createElement('span', null, String(currentProjectRows.length)),
            ),
            listenerRows(currentProjectRows),
            ),
            developmentEnvironmentRows.length === 0 ? null : React.createElement('div', {
              className: 'dsh-ri-list-group',
              'data-runtime-inspector-group': 'development-environment',
            },
            React.createElement('div', { className: 'dsh-ri-list-group-heading' },
              React.createElement('span', null, '开发环境'),
              React.createElement('span', null, String(developmentEnvironmentRows.length)),
            ),
            listenerRows(developmentEnvironmentRows),
            ),
            pinnedRows.length === 0 ? null : React.createElement('div', {
              className: 'dsh-ri-list-group',
              'data-runtime-inspector-group': 'pinned',
            },
            React.createElement('div', { className: 'dsh-ri-list-group-heading' },
              React.createElement('span', null, '固定显示'),
              React.createElement('span', null, String(pinnedRows.length)),
            ),
            listenerRows(pinnedRows),
            ),
            otherRows.length === 0 ? null : React.createElement('div', {
              className: 'dsh-ri-list-group',
              'data-runtime-inspector-group': 'other',
            },
            showOtherRows
              ? React.createElement(React.Fragment, null,
                React.createElement('div', { className: 'dsh-ri-list-group-heading' },
                  React.createElement('span', null, '其他监听'),
                  React.createElement('span', null, String(otherRows.length)),
                ),
                searching ? React.createElement('p', { className: 'dsh-ri-search-scope-note' }, '搜索已覆盖全部监听，包括默认收起的后台进程。') : null,
                listenerRows(otherRows),
              )
              : React.createElement('button', {
                type: 'button',
                className: 'dsh-ri-other-toggle',
                'aria-expanded': false,
                'data-runtime-inspector-other-toggle': 'open',
                onClick: () => { setOtherOpen(true) },
              },
              React.createElement('span', null, `已收起 ${String(otherRows.length)} 个其他监听`),
              React.createElement('span', null, IconChevron({ size: 14 })),
              ),
            ),
          ),
      ),
      React.createElement('section', { className: 'dsh-ri-detail-column', 'aria-label': '监听端口详情' },
        React.createElement(DetailPanel, {
          row: selectedRow,
          snapshot,
          pending,
          onCopy: copyDetails,
          onOpenDirectory: openDirectory,
          onRequest: setPending,
          sessionContext,
        }),
      ),
    ),
  ),
  pendingRow === undefined || pending === undefined ? null : React.createElement(ConfirmDialog, {
    row: pendingRow,
    request: pending,
    onConfirm: confirmAction,
    onCancel: () => { setPending(undefined) },
  }),
  ),
  )
}

export function createSidebarEntry(
  rpc: RuntimeInspectorBrowserRpc,
  onOpen: () => void,
  sessions: RuntimeInspectorClientSessionsLike,
): (props: unknown) => React.ReactNode {
  return (props: unknown) => {
    const options = typeof props === 'object' && props !== null ? props as Partial<SidebarEntryProps> : {}
    return SidebarEntry({ wide: options.wide, onOpen, rpc, sessions })
  }
}

export function createRuntimeInspectorPanel(
  rpc: RuntimeInspectorBrowserRpc,
  sessions: RuntimeInspectorClientSessionsLike,
): (props: unknown) => React.ReactNode {
  return () => RuntimeInspectorPanel({ rpc, sessions })
}
