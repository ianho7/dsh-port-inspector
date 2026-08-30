const { useMemo, useState } = React

const FILTER_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'dsh', label: 'DSH 来源' },
  { id: 'unconfirmed', label: '来源未确认' },
  { id: 'actionable', label: '可处理' },
]

const SCENES = [
  { id: 'normal', label: '正常' },
  { id: 'empty', label: '空列表' },
  { id: 'incomplete', label: '扫描不完整' },
  { id: 'degraded', label: '降级只读' },
]

function sourceLabel(row, scene) {
  if (scene === 'degraded') return '来源追踪暂不可用'
  return row.source === 'confirmed' ? 'DSH 来源已确认' : '来源未确认'
}

function sourceSignal(row) {
  if (row.source === 'confirmed') return null
  if (row.source === 'clue') return { kind: 'clue', label: '发现 DSH 线索' }
  return { kind: 'unknown', label: '未找到可靠 DSH 关联' }
}

function actionLabel(row, scene) {
  if (scene === 'degraded' || scene === 'incomplete') return '仅可查看'
  return row.actionLabel
}

function actionTone(row, scene) {
  if (scene === 'degraded' || scene === 'incomplete' || row.action === 'readonly') return 'disabled'
  return row.action
}

function appSummary(row) {
  return `${row.app} · ${row.service}`
}

function Metric({ value, label }) {
  return (
    <div className="summary-item">
      <span className="summary-value">{value}</span>
      <span className="summary-label">{label}</span>
    </div>
  )
}

function SourcePill({ row, scene, compact = false }) {
  const signal = sourceSignal(row)
  const isConfirmed = scene !== 'degraded' && row.source === 'confirmed'
  return (
    <span className={`source-pill ${isConfirmed ? 'is-confirmed' : 'is-unconfirmed'}`}>
      {signal !== null && scene !== 'degraded' && (
        <span className="source-signal" aria-label={signal.label} title={signal.label}>
          {signal.kind === 'clue' ? <window.IconLinkSignal size={12} /> : <window.IconEmptyLink size={12} />}
        </span>
      )}
      {compact ? (isConfirmed ? 'DSH 已确认' : '未确认') : sourceLabel(row, scene)}
    </span>
  )
}

function ActionPill({ row, scene }) {
  const tone = actionTone(row, scene)
  return <span className={`action-pill is-${tone}`}>{actionLabel(row, scene)}</span>
}

function ListenerRow({ row, selected, scene, onSelect, resolved }) {
  return (
    <button
      type="button"
      className={`listener-row ${selected ? 'is-selected' : ''} ${scene !== 'normal' ? 'is-limited' : ''} ${resolved ? 'is-resolved' : ''}`}
      data-port-inspector-row={row.id}
      data-port-inspector-selected={selected ? 'true' : 'false'}
      aria-pressed={selected}
      onClick={() => onSelect(row.id)}
    >
      <span className="row-top">
        <span className="row-port">{row.port}</span>
        <span className="protocol-pill">{row.protocol}</span>
        <span className="row-chevron"><window.IconChevron size={15} /></span>
      </span>
      <span className="row-app"><strong>{row.app}</strong><span> · {row.service}</span></span>
      <span className="row-meta">
        <span className="row-project">{row.project === '—' ? '项目目录未知' : row.project}</span>
        <span className="row-pid">PID {row.pid}</span>
      </span>
      <span className="row-actions-line">
        <SourcePill row={row} scene={scene} />
        <ActionPill row={row} scene={scene} />
      </span>
    </button>
  )
}

function Fact({ label, value, mono = false, wide = false }) {
  return (
    <div className={`fact ${wide ? 'fact-wide' : ''}`}>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : ''}>{value}</dd>
    </div>
  )
}

function SourceDetail({ row, scene }) {
  const confirmed = scene === 'normal' && row.source === 'confirmed'
  const signal = sourceSignal(row)
  const description = scene === 'degraded'
    ? '当前兼容性状态不允许建立或展示可靠的 DSH 来源关系。'
    : confirmed
      ? row.sourceHint
      : row.sourceHint
  return (
    <div className="source-detail-card">
      <div className="source-detail-head">
        <div className={`source-detail-icon ${confirmed ? '' : 'is-unconfirmed'}`}>
          {scene === 'degraded'
            ? <window.IconInfo size={16} />
            : confirmed
              ? <window.IconCheck size={17} />
              : signal?.kind === 'clue'
                ? <window.IconLinkSignal size={16} />
                : <window.IconEmptyLink size={16} />}
        </div>
        <div className="source-detail-copy">
          <strong>{sourceLabel(row, scene)}</strong>
          <span>{description}</span>
        </div>
      </div>
      {confirmed && (
        <div className="owner-line">
          <span>Lifecycle owner</span>
          <span className="owner-pill">{row.ownerKind} · {row.ownerId}</span>
        </div>
      )}
      {scene !== 'degraded' && !confirmed && signal !== null && (
        <div className="owner-line">
          <span>可展示的来源信息</span>
          <span className="owner-pill" style={{ background: '#f1f3f6', color: '#566273' }}>仅供核对</span>
        </div>
      )}
    </div>
  )
}

function HandlingCard({ row, scene, onAction }) {
  const disabled = scene !== 'normal' || row.action === 'readonly'
  const managed = !disabled && row.action === 'managed'
  const external = !disabled && row.action === 'external'
  return (
    <div className={`handling-card ${external ? 'is-external' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <div className="action-card-head">
        <strong>{disabled ? '当前仅可查看' : managed ? 'DSH 托管操作' : '外部单 PID 操作'}</strong>
        <span>{disabled ? '操作已关闭' : managed ? '通过 Job / Terminal owner' : '身份复核后执行'}</span>
      </div>
      <p>
        {disabled
          ? scene === 'degraded'
            ? '来源追踪暂不可用，系统不会提供进程操作。'
            : '扫描尚未完整结束，暂不允许使用操作。'
          : managed
            ? '将通过 DSH 生命周期关闭受管资源，并在完成后重新扫描端口。'
            : '只会结束当前选中的 PID，不会处理它的子进程；执行前会重新校验身份。'}
      </p>
      <div className="button-row">
        <button
          type="button"
          className={`button ${external ? 'button-external' : 'button-primary'}`}
          disabled={disabled}
          data-port-inspector-action={disabled ? 'unavailable' : row.action}
          onClick={() => onAction(row)}
        >
          {external ? <window.IconStop size={14} /> : managed ? <window.IconStop size={14} /> : null}
          {disabled ? '仅可查看' : managed ? '停止 DSH 任务' : '结束该进程'}
        </button>
      </div>
    </div>
  )
}

function DetailPanel({ row, scene, onAction, onCopy, onOpenDirectory }) {
  if (row === undefined) {
    return (
      <div className="detail-empty">
        <div className="detail-empty-mark"><window.IconPulse size={20} /></div>
        <h2>选择一个监听端口</h2>
        <p>查看来源证据、生命周期 owner 和当前可用的处理方式。</p>
      </div>
    )
  }
  return (
    <div data-screen-label="Port Inspector — 监听器详情">
      <header className="detail-header">
        <div className="detail-title-line">
          <span className="detail-port">:{row.port}</span>
          <span className="detail-app"><strong>{row.app}</strong> · {row.service}</span>
        </div>
        <div className="detail-subline">
          <span>{row.project === '—' ? '项目目录未知' : row.project}</span>
          <span>·</span>
          <span className="mono">PID {row.pid}</span>
          <SourcePill row={row} scene={scene} compact />
        </div>
      </header>

      <section className="detail-section">
        <h2>监听器</h2>
        <dl className="fact-grid">
          <Fact label="地址" value={`${row.address}:${row.port}`} mono />
          <Fact label="协议" value={row.protocol} mono />
          <Fact label="进程创建时间" value={row.created} mono />
          <Fact label="项目目录" value={row.projectPath || '未知'} />
        </dl>
      </section>

      <section className="detail-section">
        <h2>来源</h2>
        <SourceDetail row={row} scene={scene} />
        {scene === 'normal' && row.source === 'confirmed' && (
          <dl className="fact-grid">
            <Fact label="Session" value={row.sessionTitle || row.sessionId} />
            <Fact label="用户请求" value={row.requestSummary || '未提供'} wide />
            <Fact label="Turn / Step" value={`${row.turn} / ${row.step}`} mono />
            <Fact label="Call ID" value={row.callId} mono />
            <Fact label="Tool" value={row.tool} mono />
          </dl>
        )}
      </section>

      <section className="detail-section">
        <h2>处理方式</h2>
        <HandlingCard row={row} scene={scene} onAction={onAction} />
      </section>

      <section className="detail-actions">
        <button type="button" className="button button-secondary" data-port-inspector-copy={row.id} onClick={() => onCopy(row)}>
          <window.IconCopy size={14} />复制脱敏详情
        </button>
        <button type="button" className="button button-secondary" disabled={!row.projectPath || scene !== 'normal'} data-port-inspector-open-directory={row.id} onClick={() => onOpenDirectory(row)}>
          <window.IconFolder size={14} />打开项目目录
        </button>
      </section>
    </div>
  )
}

function ConfirmDialog({ row, onCancel, onConfirm }) {
  const external = row.action === 'external'
  return (
    <div className="modal-backdrop">
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="runtime-confirm-title" data-port-inspector-confirmation="dialog">
        <div className="confirm-dialog-head">
          <div className={`confirm-icon ${external ? 'is-external' : ''}`}>
            {external ? <window.IconExternal size={17} /> : <window.IconStop size={17} />}
          </div>
          <div>
            <h2 id="runtime-confirm-title">{external ? '确认结束该进程' : '确认停止 DSH 任务'}</h2>
            <p>{external ? '这是外部单 PID 操作，与 DSH 归因无关。' : '将通过 DSH 生命周期关闭受管资源。'}</p>
          </div>
        </div>
        <dl className="identity-snapshot">
          <Fact label="端口" value={`:${row.port}`} mono />
          <Fact label="PID" value={String(row.pid)} mono />
          <Fact label="创建时间" value={row.created} mono />
          <Fact label="可执行文件" value={`${row.app}.exe`} mono />
        </dl>
        <p className="confirm-note">
          <window.IconInfo size={15} />
          <span>{external ? '执行前 Host 会重新扫描并校验 PID、创建时间和可执行文件。目标发生变化时，操作会被拒绝。' : '停止完成后 Host 会重新扫描，并报告端口是否释放。失败不会自动升级为 PID 终止。'}</span>
        </p>
        <div className="confirm-actions">
          <button type="button" className="button button-secondary" data-port-inspector-confirm="cancel" onClick={onCancel}>取消</button>
          <button type="button" className={`button ${external ? 'button-external' : 'button-primary'}`} data-port-inspector-confirm="confirm" onClick={onConfirm}>{external ? '确认结束进程' : '确认停止任务'}</button>
        </div>
      </section>
    </div>
  )
}

function App() {
  const [open, setOpen] = useState(true)
  const [selectedId, setSelectedId] = useState('5173')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [scene, setScene] = useState('normal')
  const [sort, setSort] = useState('port')
  const [resolvedIds, setResolvedIds] = useState(() => new Set())
  const [confirmation, setConfirmation] = useState(undefined)
  const [notice, setNotice] = useState(undefined)

  const sceneRows = scene === 'empty' ? [] : runtimeInspectorRows.filter(row => !resolvedIds.has(row.id))
  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...sceneRows]
      .filter(row => {
        if (filter === 'dsh') return row.source === 'confirmed'
        if (filter === 'unconfirmed') return row.source !== 'confirmed'
        if (filter === 'actionable') return scene === 'normal' && row.action !== 'readonly'
        return true
      })
      .filter(row => query.length === 0 || [row.port, row.app, row.service, row.project, row.pid, row.sourceHint].join(' ').toLowerCase().includes(query))
      .sort((left, right) => sort === 'pid' ? left.pid - right.pid : left.port - right.port)
  }, [filter, scene, sceneRows, search, sort])

  const selectedRow = sceneRows.find(row => row.id === selectedId)
  const sessionCountKnown = scene !== 'degraded'
  const currentSessionCount = sessionCountKnown
    ? sceneRows.filter(row => row.source === 'confirmed' && row.session === '当前会话').length
    : '—'
  const actionableCount = scene === 'normal' ? sceneRows.filter(row => row.action !== 'readonly').length : 0
  const readOnlyCount = Math.max(0, sceneRows.length - actionableCount)

  const showNotice = (text) => {
    setNotice(text)
    window.setTimeout(() => setNotice(undefined), 2600)
  }

  const handleScene = (nextScene) => {
    setScene(nextScene)
    setConfirmation(undefined)
    setFilter('all')
    if (nextScene === 'empty') setSelectedId(undefined)
    else if (selectedId === undefined) setSelectedId('5173')
  }

  const handleRefresh = () => {
    setResolvedIds(new Set())
    showNotice('已完成一次新的监听扫描')
  }

  const handleAction = (row) => {
    if (scene !== 'normal' || row.action === 'readonly') return
    setConfirmation(row)
  }

  const confirmAction = () => {
    const row = confirmation
    if (row === undefined) return
    setResolvedIds(current => new Set([...current, row.id]))
    setConfirmation(undefined)
    setSelectedId(undefined)
    showNotice(`端口 ${row.port} 已完成处理，正在展示新的扫描结果`)
  }

  const handleCopy = (row) => showNotice(`已复制端口 ${row.port} 的脱敏详情`)
  const handleOpenDirectory = (row) => showNotice(`已请求打开 ${row.project} 项目目录`)

  const modeText = scene === 'degraded' ? '来源追踪暂不可用' : scene === 'incomplete' ? '只读状态' : '观察模式'
  const limited = scene === 'incomplete' || scene === 'degraded'

  return (
    <main className="app-frame" data-screen-label="Port Inspector — 主工作台">
      <aside className="host-rail" aria-label="DSH 主导航">
        <div className="host-mark">DSH</div>
        <div className="host-rail-dots" aria-hidden="true"><span></span><span></span><span></span></div>
        <div className="host-mark" style={{ width: 28, height: 28, borderRadius: 9, fontSize: 10 }}>A</div>
      </aside>

      <section className="host-context" aria-label="DSH 当前会话背景">
        <header className="host-topbar">
          <div className="host-breadcrumb"><strong>Workspace</strong><span>/</span><span>Session · dsh-port-inspector</span></div>
          <span className="host-breadcrumb">Windows local execution</span>
        </header>
        <div className="host-context-body">
          <div className="host-context-copy">
            <p className="host-context-eyebrow">Current session / turn 18</p>
            <h2>Build a clear path from agent action to running service.</h2>
            <p>Port Inspector keeps the local port surface visible while the current DSH session stays in focus.</p>
          </div>
          <div className="host-context-card" aria-hidden="true">
            <div className="host-context-line"><i className="is-blue"></i><span>terminal · npm run dev · 5173</span></div>
            <div className="host-context-line"><i className="is-blue"></i><span>run_in_background · next dev · 3000</span></div>
            <div className="host-context-line"><i></i><span>Conversation remains available behind the panel</span></div>
            <div className="host-context-line"><i></i><span>Last local scan · just now</span></div>
          </div>
        </div>
      </section>

      <button type="button" className="sidebar-entry" data-port-inspector-entry="open" aria-label={sessionCountKnown ? `打开 Port Inspector，当前会话已确认启动 ${currentSessionCount} 个监听端口` : '打开 Port Inspector，当前会话端口数暂不可确认'} onClick={() => setOpen(true)}>
        <window.IconPulse size={20} />
        <span className={`sidebar-entry-badge ${sessionCountKnown ? '' : 'is-unavailable'}`}>{currentSessionCount}</span>
      </button>

      {open && (
        <div className="overlay" data-port-inspector-panel="overlay">
          <section className="inspector-panel" role="dialog" aria-modal="true" aria-labelledby="port-inspector-title" data-port-inspector-surface="panel">
            <header className="panel-header">
              <div className="panel-title-wrap">
                <div className="panel-title-line">
                  <h1 id="port-inspector-title">Port Inspector</h1>
                  <span className={`mode-pill ${limited ? 'is-limited' : ''}`}><span className="mode-dot"></span>{modeText}</span>
                </div>
              </div>
              <button type="button" className="icon-button" data-port-inspector-close="close" aria-label="关闭 Port Inspector" onClick={() => setOpen(false)}><window.IconClose size={18} /></button>
            </header>

            <div className="summary-strip" aria-label="监听摘要">
              <Metric value={sceneRows.length} label="监听" />
              <Metric value={actionableCount} label="可处理" />
              <Metric value={readOnlyCount} label="仅可查看" />
              <Metric value={currentSessionCount} label="本会话已确认" />
            </div>

            <div>
              <div className="toolbar" data-port-inspector-toolbar="controls">
                <label className="search-box">
                  <window.IconSearch size={16} />
                  <input type="search" value={search} aria-label="搜索监听端口" placeholder="搜索端口、应用、项目或 PID" data-port-inspector-search="input" onChange={event => setSearch(event.target.value)} />
                </label>
                <select className="sort-select" aria-label="排序监听端口" data-port-inspector-sort="select" value={sort} onChange={event => setSort(event.target.value)}>
                  <option value="port">按端口</option>
                  <option value="pid">按 PID</option>
                </select>
                <button type="button" className="icon-button" aria-label="刷新端口列表" data-port-inspector-refresh="refresh" onClick={handleRefresh}><window.IconRefresh size={16} /></button>
                <div className="filter-row" role="tablist" aria-label="监听器筛选">
                  {FILTER_OPTIONS.map(option => (
                    <button key={option.id} type="button" role="tab" aria-selected={filter === option.id} className={`filter-chip ${filter === option.id ? 'is-active' : ''}`} onClick={() => setFilter(option.id)}>{option.label}</button>
                  ))}
                </div>
              </div>
              {scene === 'degraded' && <div className="scan-banner" role="status"><window.IconInfo size={16} /><span>来源追踪暂不可用。当前列表仅用于查看，所有行的操作能力已关闭。</span></div>}
              {scene === 'incomplete' && <div className="scan-banner" role="status"><window.IconInfo size={16} /><span>本次扫描尚未完整结束。为了避免误操作，当前只显示信息，不提供进程操作。</span></div>}
            </div>

            <div className="panel-body">
              <section className="list-column" aria-label="监听器列表">
                {visibleRows.length > 0 ? (
                  <>
                    <div className="column-heading"><h2>监听端口</h2><span>{visibleRows.length} items</span></div>
                    <ul className="listener-list" data-port-inspector-list="listeners">
                      {visibleRows.map(row => <li key={row.id}><ListenerRow row={row} selected={selectedId === row.id} scene={scene} onSelect={setSelectedId} resolved={resolvedIds.has(row.id)} /></li>)}
                    </ul>
                  </>
                ) : (
                  <div className="empty-state" data-port-inspector-state="empty">
                    <div className="empty-state-mark"><window.IconPulse size={22} /></div>
                    <h2>{scene === 'empty' ? '当前没有监听端口' : '没有匹配的监听端口'}</h2>
                    <p>{scene === 'empty' ? '当当前 DSH 会话启动开发服务后，端口会出现在这里。' : '尝试清除搜索或切换筛选条件。'}</p>
                  </div>
                )}
              </section>
              <aside className="detail-column" aria-label="监听器详情">
                <DetailPanel row={selectedRow} scene={scene} onAction={handleAction} onCopy={handleCopy} onOpenDirectory={handleOpenDirectory} />
              </aside>
            </div>
          </section>
        </div>
      )}

      {confirmation !== undefined && <ConfirmDialog row={confirmation} onCancel={() => setConfirmation(undefined)} onConfirm={confirmAction} />}
      {notice !== undefined && <div className="toast" role="status"><window.IconCheck size={16} />{notice}</div>}

      <nav className="prototype-dock" aria-label="原型场景切换">
        <span className="prototype-dock-label">预览场景</span>
        {SCENES.map(option => <button key={option.id} type="button" className={scene === option.id ? 'is-active' : ''} aria-pressed={scene === option.id} onClick={() => handleScene(option.id)}>{option.label}</button>)}
      </nav>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
