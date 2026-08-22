import * as React from 'react'
import type {
  HostActionKind,
  HostActionRequest,
  HostInventorySnapshot,
  HostListenerRow,
} from '../host-ui.js'
import type { RuntimeInspectorBrowserRpc } from './bridge.js'

interface SidebarEntryProps {
  readonly wide?: boolean
  readonly onOpen: () => void
  readonly rpc: RuntimeInspectorBrowserRpc
}

interface PanelProps {
  readonly rpc: RuntimeInspectorBrowserRpc
}

interface PanelState {
  readonly snapshot?: HostInventorySnapshot
  readonly error?: string
  readonly actionResult?: string
  readonly postAction?: boolean
}

const panelState = {
  open: false,
  listeners: new Set<() => void>(),
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

function textForMode(snapshot: HostInventorySnapshot): string {
  return snapshot.mode === 'observing' ? '观察模式：支持安全操作' : '只读降级模式：操作已禁用'
}

function actionLabel(kind: HostActionKind): string {
  switch (kind) {
    case 'managed-shutdown': return '停止 DSH 托管进程'
    case 'external-single-pid': return '终止外部单个进程'
    case 'read-only': return '只读'
    case 'degraded': return '降级只读'
  }
}

function sortRows(rows: readonly HostListenerRow[], key: 'port' | 'application' | 'pid' | 'project' | 'session', direction: 'asc' | 'desc'): HostListenerRow[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => {
    const value = (row: HostListenerRow): string | number => {
      switch (key) {
        case 'port': return row.port
        case 'pid': return row.pid
        case 'application': return row.executable ?? ''
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
  return [row.port, row.pid, row.executable, row.project, row.sessionVisibility, row.confidence]
    .filter(value => value !== undefined)
    .join(' ')
    .toLowerCase()
}

function actionButton(
  row: HostListenerRow,
  pending: HostActionRequest | undefined,
  onRequest: (request: HostActionRequest) => void,
): React.ReactNode {
  if (!row.action.available) return React.createElement('span', { 'data-runtime-inspector-action': 'unavailable' }, row.action.reason ?? actionLabel(row.action.kind))
  const request: HostActionRequest = { listenerId: row.listenerId, kind: row.action.kind }
  return React.createElement('button', {
    type: 'button',
    'aria-label': `${actionLabel(row.action.kind)}：端口 ${String(row.port)}`,
    'data-runtime-inspector-action': row.action.kind,
    disabled: pending !== undefined,
    onClick: () => { onRequest(request) },
  }, actionLabel(row.action.kind))
}

function listenerRow(
  row: HostListenerRow,
  selected: boolean,
  pending: HostActionRequest | undefined,
  onRequest: (request: HostActionRequest) => void,
  onSelect: (listenerId: string) => void,
  onCopy: (row: HostListenerRow) => void,
  onOpen: (row: HostListenerRow) => void,
): React.ReactNode {
  const attribution = row.sessionVisibility === 'another-dsh-session' ? '另一个 DSH 会话' : row.sessionVisibility
  return React.createElement('li', {
    key: row.listenerId,
    'data-runtime-inspector-row': row.listenerId,
    'data-runtime-inspector-selected': selected ? 'true' : 'false',
  },
  React.createElement('button', {
    type: 'button',
    'aria-label': `选择端口 ${String(row.port)}，PID ${String(row.pid)}`,
    'aria-pressed': selected,
    'data-runtime-inspector-select': row.listenerId,
    onClick: () => { onSelect(row.listenerId) },
  }, React.createElement('strong', null, `端口 ${String(row.port)} · PID ${String(row.pid)}`)),
  React.createElement('span', { 'data-runtime-inspector-confidence': row.confidence }, ` ${row.confidence} · ${attribution}`),
  row.executable === undefined ? null : React.createElement('span', null, ` · ${row.executable}`),
  row.lifecycleOwner === undefined ? null : React.createElement('span', null, ` · Owner ${row.lifecycleOwner.kind}:${row.lifecycleOwner.id}`),
  React.createElement('div', { className: 'dsh-runtime-inspector-row-actions' },
    React.createElement('button', {
      type: 'button',
      'aria-label': `复制端口 ${String(row.port)} 详情`,
      'data-runtime-inspector-copy': row.listenerId,
      onClick: () => { onCopy(row) },
    }, '复制详情'),
    React.createElement('button', {
      type: 'button',
      'aria-label': `打开端口 ${String(row.port)} 项目目录`,
      'data-runtime-inspector-open-directory': row.listenerId,
      onClick: () => { onOpen(row) },
    }, '打开项目目录'),
    actionButton(row, pending, onRequest),
  ))
}

function SidebarEntry({ wide = true, onOpen, rpc }: SidebarEntryProps): React.ReactNode {
  const [count, setCount] = React.useState<number>()
  React.useEffect(() => {
    void rpc.inventory().then(snapshot => { setCount(Math.min(snapshot.listeners.length, 99)) }, () => { setCount(undefined) })
  }, [rpc])
  const indicator = count === undefined ? '' : `（${String(count)}${count === 99 ? '+' : ''}）`
  return React.createElement('button', {
    type: 'button',
    title: 'Runtime Inspector',
    'aria-label': wide ? `打开 Runtime Inspector${indicator}` : `Runtime Inspector${indicator}`,
    'data-runtime-inspector-entry': 'open',
    onClick: onOpen,
  }, wide ? `端口检查${indicator}` : `端口${indicator}`)
}

function RuntimeInspectorPanel({ rpc }: PanelProps): React.ReactNode {
  const open = usePanelOpen()
  const [state, setState] = React.useState<PanelState>({})
  const [search, setSearch] = React.useState('')
  const [sortKey, setSortKey] = React.useState<'port' | 'application' | 'pid' | 'project' | 'session'>('port')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  const [selectedListenerId, setSelectedListenerId] = React.useState<string>()
  const [pending, setPending] = React.useState<HostActionRequest>()

  const refresh = (): void => {
    setState((previous: PanelState) => ({ ...previous, error: undefined, actionResult: undefined }))
    void rpc.inventory().then(
      snapshot => { setState({ snapshot }) },
      error => { setState({ error: error instanceof Error ? error.message : String(error) }) },
    )
  }

  React.useEffect(() => {
    if (open) refresh()
  }, [open])

  if (!open) return null

  const snapshot = state.snapshot
  const visibleRows = snapshot === undefined ? [] : sortRows(
    snapshot.listeners.filter((row: HostListenerRow) => rowSearchText(row).includes(search.toLowerCase().trim())),
    sortKey,
    sortDirection,
  )

  const confirmAction = (): void => {
    if (pending === undefined) return
    const request = { ...pending, confirmed: true }
    setPending(undefined)
    void rpc.performAction(request).then(
      result => {
        setState({ snapshot: result.freshScan, actionResult: result.message, postAction: true })
      },
      error => { setState((previous: PanelState) => ({ ...previous, error: error instanceof Error ? error.message : String(error) })) },
    )
  }

  return React.createElement('div', {
    role: 'presentation',
    'data-runtime-inspector-panel': 'overlay',
    style: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1000 },
  }, React.createElement('section', {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': 'dsh-runtime-inspector-title',
    'data-runtime-inspector-surface': 'panel',
    style: {
      pointerEvents: 'auto', position: 'absolute', top: 'var(--dsw-space-4, 16px)', right: 'var(--dsw-space-4, 16px)',
      width: 'min(720px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'auto',
      padding: 'var(--dsw-space-4, 16px)', background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)', border: '1px solid var(--dsw-alias-border)',
    },
  },
  React.createElement('header', null,
    React.createElement('h2', { id: 'dsh-runtime-inspector-title' }, 'Runtime Inspector'),
    React.createElement('button', {
      type: 'button', 'aria-label': '关闭 Runtime Inspector', 'data-runtime-inspector-close': 'close',
      onClick: () => { setPanelOpen(false) },
    }, '关闭'),
  ),
  state.error === undefined && snapshot === undefined
    ? React.createElement('p', { 'data-runtime-inspector-state': 'loading' }, '正在扫描占用端口…')
    : null,
  state.error === undefined && snapshot !== undefined
    ? React.createElement('p', { 'data-runtime-inspector-state': snapshot.scanComplete ? 'ready' : 'incomplete' },
      `${textForMode(snapshot)} · ${snapshot.scanComplete ? '扫描完成' : '扫描不完整'}`,
      snapshot.truncated ? ' · 结果已截断' : '',
    )
    : null,
  state.error === undefined && snapshot !== undefined
    ? React.createElement('div', { 'data-runtime-inspector-toolbar': 'controls' },
      React.createElement('label', null, '搜索', React.createElement('input', {
        type: 'search', value: search, 'aria-label': '搜索占用端口', 'data-runtime-inspector-search': 'input',
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => { setSearch(event.target.value) },
      })),
      React.createElement('label', null, '排序', React.createElement('select', {
        value: sortKey, 'aria-label': '排序占用端口', 'data-runtime-inspector-sort': 'select',
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => { setSortKey(event.target.value as typeof sortKey) },
      },
      React.createElement('option', { value: 'port' }, '端口'),
      React.createElement('option', { value: 'application' }, '应用'),
      React.createElement('option', { value: 'pid' }, 'PID'),
      React.createElement('option', { value: 'project' }, '项目'),
      React.createElement('option', { value: 'session' }, '会话'),
      )),
      React.createElement('button', {
        type: 'button', 'aria-label': '切换排序方向', 'data-runtime-inspector-sort-direction': 'toggle',
        onClick: () => { setSortDirection((previous: 'asc' | 'desc') => previous === 'asc' ? 'desc' : 'asc') },
      }, sortDirection === 'asc' ? '升序' : '降序'),
      React.createElement('button', {
        type: 'button', 'aria-label': '刷新端口列表', 'data-runtime-inspector-refresh': 'refresh', onClick: refresh,
      }, '刷新'),
    )
    : null,
  state.error === undefined && snapshot !== undefined && visibleRows.length === 0
    ? React.createElement('p', { 'data-runtime-inspector-state': 'empty' }, '没有发现匹配的监听端口。')
    : null,
  state.error !== undefined
    ? React.createElement('p', { role: 'alert', 'data-runtime-inspector-state': 'failure' }, `面板暂不可用，只读：${state.error}`)
    : null,
  state.actionResult === undefined ? null : React.createElement('p', {
    role: 'status',
    'data-runtime-inspector-state': state.postAction === true ? 'post-action' : 'result',
    'data-runtime-inspector-action-result': 'result',
  }, state.actionResult),
  React.createElement('ul', { 'data-runtime-inspector-list': 'listeners' }, visibleRows.map(row => listenerRow(
    row,
    selectedListenerId === row.listenerId,
    pending,
    setPending,
    setSelectedListenerId,
    current => { void rpc.copyDetails({ listenerId: current.listenerId }).then(result => { setState((previous: PanelState) => ({ ...previous, actionResult: result.ok ? '详情已复制。' : result.error ?? '复制失败。' })) }) },
    current => { void rpc.openProjectDirectory({ listenerId: current.listenerId }).then(result => { setState((previous: PanelState) => ({ ...previous, actionResult: result.ok ? '已打开项目目录。' : result.error ?? '项目目录不可用。' })) }) },
  ))),
  pending === undefined ? null : React.createElement('div', {
    role: 'alertdialog', 'aria-modal': true, 'aria-labelledby': 'dsh-runtime-inspector-confirm-title',
    'data-runtime-inspector-confirmation': 'dialog',
  },
  React.createElement('h3', { id: 'dsh-runtime-inspector-confirm-title' }, '确认操作'),
  React.createElement('p', null, `将${actionLabel(pending.kind)}（监听器 ${pending.listenerId}）。Host 会重新扫描并校验身份。`),
  React.createElement('button', { type: 'button', 'data-runtime-inspector-confirm': 'confirm', onClick: confirmAction }, '确认'),
  React.createElement('button', { type: 'button', 'data-runtime-inspector-confirm': 'cancel', onClick: () => { setPending(undefined) } }, '取消'),
  ),
  ))
}

export function createSidebarEntry(rpc: RuntimeInspectorBrowserRpc, onOpen: () => void): (props: unknown) => React.ReactNode {
  return (props: unknown) => SidebarEntry({ ...(typeof props === 'object' && props !== null ? props as SidebarEntryProps : {}), onOpen, rpc })
}

export function createRuntimeInspectorPanel(rpc: RuntimeInspectorBrowserRpc): (props: unknown) => React.ReactNode {
  return () => RuntimeInspectorPanel({ rpc })
}
