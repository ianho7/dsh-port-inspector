export type RuntimeInspectorLocale = 'zh' | 'en'

export interface RuntimeInspectorLocaleSnapshotLike {
  readonly active?: unknown
}

export interface RuntimeInspectorLocaleSource {
  readonly getSnapshot?: () => RuntimeInspectorLocaleSnapshotLike
  readonly getLocale?: () => RuntimeInspectorLocaleSnapshotLike
  readonly subscribe?: (listener: () => void) => () => void
}

export interface RuntimeInspectorLocaleContext {
  readonly get?: (name: string) => unknown
  readonly locale?: RuntimeInspectorLocaleSource
}

export interface RuntimeInspectorLocaleStore {
  readonly getSnapshot: () => RuntimeInspectorLocale
  readonly subscribe: (listener: () => void) => () => void
}

export type RuntimeInspectorMessageKey =
  | 'entryLabel'
  | 'entryCompactTitle'
  | 'entryAriaUnavailable'
  | 'entryAriaCount'
  | 'openPanelAria'
  | 'refresh'
  | 'closePanel'
  | 'searchPlaceholder'
  | 'actionManaged'
  | 'actionExternal'
  | 'actionReadOnly'
  | 'actionManagedCompact'
  | 'actionExternalCompact'
  | 'unknownProcess'
  | 'currentSession'
  | 'anotherSession'
  | 'sourceVerified'
  | 'sourceUnconfirmed'
  | 'sourceDegraded'
  | 'sourceInferredTitle'
  | 'sourceVerifiedCurrent'
  | 'sourceVerifiedAnother'
  | 'sourceInferredDescription'
  | 'sourceUnattributedDescription'
  | 'sourceDegradedDescription'
  | 'composeAssociation'
  | 'composeDetails'
  | 'composeFile'
  | 'composeService'
  | 'composeImage'
  | 'composeContainer'
  | 'composeMapping'
  | 'handlingScanIncomplete'
  | 'handlingDegraded'
  | 'handlingManaged'
  | 'handlingExternal'
  | 'handlingIdentityIncomplete'
  | 'handlingReadOnly'
  | 'handlingComposeReadOnly'
  | 'openDirectorySuccess'
  | 'openDirectoryListenerNotFound'
  | 'openDirectoryProjectUnavailable'
  | 'openDirectoryOpenerUnavailable'
  | 'openDirectoryFailed'
  | 'selectPortPid'
  | 'pidValue'
  | 'port'
  | 'sameListenerRecordsTitle'
  | 'unpinPort'
  | 'pinPort'
  | 'unpinDisplay'
  | 'pinDisplay'
  | 'noListeners'
  | 'selectListener'
  | 'emptyRefreshCopy'
  | 'emptySelectCopy'
  | 'copyPortDetails'
  | 'openPortProjectDirectory'
  | 'sectionRuntimeInfo'
  | 'application'
  | 'pid'
  | 'listenAddress'
  | 'sameListener'
  | 'records'
  | 'createdAt'
  | 'projectDirectory'
  | 'launchCommand'
  | 'launchChain'
  | 'launchChainRoot'
  | 'launchChainIntermediate'
  | 'launchChainListener'
  | 'launchChainCommandUnavailable'
  | 'sectionSessionContext'
  | 'session'
  | 'sessionId'
  | 'callId'
  | 'userRequest'
  | 'sectionToolCall'
  | 'agentId'
  | 'turnStep'
  | 'tool'
  | 'rootCallId'
  | 'sectionSource'
  | 'workdir'
  | 'spawnType'
  | 'lifecycle'
  | 'sectionHandling'
  | 'confirmEndProcess'
  | 'confirmStopTask'
  | 'confirmEndProcessCopy'
  | 'confirmStopTaskCopy'
  | 'confirmIdentityNote'
  | 'listenPort'
  | 'unavailable'
  | 'cancel'
  | 'statusSourceLimited'
  | 'statusScanIncomplete'
  | 'loadingListeners'
  | 'panelUnavailable'
  | 'refreshFailedStale'
  | 'retry'
  | 'technicalDetails'
  | 'searchLabel'
  | 'sortLabel'
  | 'sortPort'
  | 'sortApplication'
  | 'sortPid'
  | 'sortProject'
  | 'sortSession'
  | 'sortDirection'
  | 'ascending'
  | 'descending'
  | 'view'
  | 'viewRange'
  | 'scopeDevelopment'
  | 'scopeAll'
  | 'sourceFilter'
  | 'sourceAll'
  | 'sourceDsh'
  | 'actionableOnly'
  | 'updatingPortStatus'
  | 'truncatedBanner'
  | 'listenerList'
  | 'displayCount'
  | 'noDiscoveredListeners'
  | 'noMatch'
  | 'noVisibleListeners'
  | 'adjustSearch'
  | 'groupCurrentProject'
  | 'groupDevelopmentEnvironment'
  | 'groupPinned'
  | 'groupOther'
  | 'searchScopeNote'
  | 'collapsedOther'
  | 'detailColumn'
  | 'detailsCopied'
  | 'detailsGeneratedClipboardUnavailable'
  | 'copyListenerNotFound'
  | 'copyFailed'
  | 'actionCompletedReleased'
  | 'actionCompletedStillListening'
  | 'actionCompletedUnconfirmed'
  | 'actionListenerNotFound'
  | 'actionNotAllowed'
  | 'actionConfirmationRequired'
  | 'actionOwnerUnavailable'
  | 'actionDenied'
  | 'actionFailed'
  | 'actionRequestFailed'

export type RuntimeInspectorMessageValues = Readonly<Record<string, string | number>>

type RuntimeInspectorMessage = string | ((values: RuntimeInspectorMessageValues) => string)

export interface RuntimeInspectorTranslator {
  readonly locale: RuntimeInspectorLocale
  readonly t: (key: RuntimeInspectorMessageKey, values?: RuntimeInspectorMessageValues) => string
}

const messages: Record<RuntimeInspectorLocale, Record<RuntimeInspectorMessageKey, RuntimeInspectorMessage>> = {
  zh: {
    entryLabel: '监听端口',
    entryCompactTitle: 'Runtime Inspector {indicator}',
    entryAriaUnavailable: '当前会话已确认监听端口数量暂不可用',
    entryAriaCount: '当前会话已确认监听端口 {count}',
    openPanelAria: '打开 Runtime Inspector，{details}',
    refresh: '刷新',
    searchPlaceholder: '搜索端口、PID、应用或会话',
    closePanel: '关闭 Runtime Inspector',
    actionManaged: '停止 DSH 任务',
    actionExternal: '结束该进程',
    actionReadOnly: '仅可查看',
    actionManagedCompact: '可停止',
    actionExternalCompact: '可结束',
    unknownProcess: '未识别进程',
    currentSession: '当前 DSH 会话',
    anotherSession: '另一个 DSH 会话',
    sourceVerified: '由 DSH 启动',
    sourceUnconfirmed: '启动方未确认',
    sourceDegraded: '来源追踪受限',
    sourceInferredTitle: '发现 DSH 线索，来源尚未确认',
    sourceVerifiedCurrent: '此监听端口由当前会话启动，DSH 已完成身份确认。',
    sourceVerifiedAnother: '此监听端口由另一个 DSH 会话启动，DSH 已完成身份确认。',
    sourceInferredDescription: '发现 DSH 线索，但尚未确认启动方。',
    sourceUnattributedDescription: '当前扫描未确认启动方。',
    sourceDegradedDescription: '来源追踪当前不可用；这里的状态不代表单个进程已经完成来源判断。',
    composeAssociation: 'Compose 项目关联已确认',
    composeDetails: 'Compose 运行时证据',
    composeFile: 'Compose 文件',
    composeService: '服务',
    composeImage: '镜像',
    composeContainer: '容器 ID',
    composeMapping: '端口映射',
    handlingScanIncomplete: '本次监听扫描未完成，当前结果仅用于查看。',
    handlingDegraded: '来源追踪暂不可用，此监听端口当前仅用于查看。',
    handlingManaged: '通过 DSH 生命周期执行停止；Host 会在执行前重新校验当前身份。',
    handlingExternal: '此操作与 DSH 来源归因无关；执行前会重新校验 PID、创建时间、可执行文件和监听端口。',
    handlingIdentityIncomplete: '进程身份信息不足，系统不会执行结束操作。',
    handlingReadOnly: '当前监听端口仅提供查看。',
    handlingComposeReadOnly: '已确认属于当前项目的 Compose 服务；Docker Desktop 代理端口仅可查看，不会直接终止。',
    openDirectorySuccess: '已打开项目目录。',
    openDirectoryListenerNotFound: '监听器已不存在，请刷新后重试。',
    openDirectoryProjectUnavailable: '项目目录不可用。',
    openDirectoryOpenerUnavailable: '当前环境不支持打开项目目录。',
    openDirectoryFailed: '打开项目目录失败。',
    selectPortPid: '选择端口 {port}，PID {pid}',
    pidValue: 'PID {pid}',
    port: '端口 {port}',
    sameListenerRecordsTitle: '{count} 条相同监听记录',
    unpinPort: '取消固定端口 {port}',
    pinPort: '固定显示端口 {port}',
    unpinDisplay: '取消固定显示',
    pinDisplay: '固定显示',
    noListeners: '当前没有监听端口',
    selectListener: '选择一个监听端口',
    emptyRefreshCopy: '刷新后会重新读取当前 DSH 会话可见的监听状态。',
    emptySelectCopy: '从左侧列表选择一项，在这里查看来源、会话和处理方式。',
    copyPortDetails: '复制端口 {port} 详情',
    openPortProjectDirectory: '打开端口 {port} 项目目录',
    sectionRuntimeInfo: '运行信息',
    application: '应用',
    pid: 'PID',
    listenAddress: '监听地址',
    sameListener: '相同监听',
    records: ({ count }) => `${String(count)} 条记录`,
    createdAt: '创建时间',
    projectDirectory: '项目目录',
    launchCommand: '启动命令',
    launchChain: '启动链（已确认）',
    launchChainRoot: 'Root',
    launchChainIntermediate: '中间进程',
    launchChainListener: '监听进程',
    launchChainCommandUnavailable: '命令行不可读取',
    sectionSessionContext: '会话上下文',
    session: 'Session',
    sessionId: 'Session ID',
    callId: 'Call ID',
    userRequest: '用户请求',
    sectionToolCall: '工具调用',
    agentId: 'Agent ID',
    turnStep: 'Turn / Step',
    tool: 'Tool',
    rootCallId: 'Root Call ID',
    sectionSource: '来源',
    workdir: 'Workdir',
    spawnType: 'Spawn 类型',
    lifecycle: 'DSH 生命周期',
    sectionHandling: '处理方式',
    confirmEndProcess: '确认结束该进程',
    confirmStopTask: '确认停止 DSH 任务',
    confirmEndProcessCopy: '这会直接处理一个系统进程，与 DSH 来源判断无关。执行前 Host 会重新校验进程身份。',
    confirmStopTaskCopy: '这会通过 DSH 生命周期停止当前任务。执行前 Host 会重新校验当前归属。',
    confirmIdentityNote: '请确认下面的 PID、创建时间和可执行文件仍与当前目标一致。',
    listenPort: '监听端口',
    unavailable: '不可用',
    cancel: '取消',
    statusSourceLimited: '来源追踪受限',
    statusScanIncomplete: '扫描未完成',
    loadingListeners: '正在读取监听端口',
    panelUnavailable: '无法读取监听端口。',
    refreshFailedStale: '刷新失败，当前显示上次成功结果。',
    retry: '重试',
    technicalDetails: '技术详情',
    searchLabel: '搜索占用端口',
    sortLabel: '排序占用端口',
    sortPort: '按端口',
    sortApplication: '按应用',
    sortPid: '按 PID',
    sortProject: '按项目',
    sortSession: '按会话',
    sortDirection: '切换排序方向',
    ascending: '升序',
    descending: '降序',
    view: '查看',
    viewRange: '查看范围',
    scopeDevelopment: '开发相关',
    scopeAll: '全部监听',
    sourceFilter: '按启动方筛选',
    sourceAll: '全部',
    sourceDsh: '由 DSH 启动',
    actionableOnly: '仅显示可处理',
    updatingPortStatus: '正在更新端口状态…',
    truncatedBanner: '结果数量已达到上限，列表显示当前可见部分。',
    listenerList: '监听端口列表',
    displayCount: ({ count }) => `显示 ${String(count)} 项`,
    noDiscoveredListeners: '没有发现监听端口',
    noMatch: '没有匹配项',
    noVisibleListeners: '当前 DSH 会话没有可显示的监听端口。',
    adjustSearch: '调整搜索词或筛选条件后重试。',
    groupCurrentProject: '当前项目',
    groupDevelopmentEnvironment: '开发环境',
    groupPinned: '固定显示',
    groupOther: '其他监听',
    searchScopeNote: '搜索已覆盖全部监听，包括默认收起的后台进程。',
    collapsedOther: ({ count }) => `已收起 ${String(count)} 个其他监听`,
    detailColumn: '监听端口详情',
    detailsCopied: '详情已复制。',
    detailsGeneratedClipboardUnavailable: '详情已生成，但剪贴板不可用。',
    copyListenerNotFound: '监听器已不存在，无法复制详情。',
    copyFailed: '复制失败。',
    actionCompletedReleased: ({ action, port }) => `${String(action)} 已完成；端口 ${String(port)} 已不再监听。`,
    actionCompletedStillListening: ({ action, port }) => `${String(action)} 已完成，但端口 ${String(port)} 仍在监听。`,
    actionCompletedUnconfirmed: ({ action, port }) => `${String(action)} 已完成，但刷新扫描无法确认端口 ${String(port)} 是否已释放。`,
    actionListenerNotFound: '监听器已不存在，请刷新后重试。',
    actionNotAllowed: '当前监听端口不允许执行请求的操作。',
    actionConfirmationRequired: '执行此操作前需要明确确认。',
    actionOwnerUnavailable: 'DSH 生命周期所有者已不可用。',
    actionDenied: '当前操作未执行。',
    actionFailed: ({ action, port }) => `${String(action)}失败；端口 ${String(port)} 的状态已重新读取。`,
    actionRequestFailed: ({ action, port }) => `${String(action)}失败；无法确认端口 ${String(port)} 的最新状态。`,
  },
  en: {
    entryLabel: 'Listening ports',
    entryCompactTitle: 'Runtime Inspector {indicator}',
    entryAriaUnavailable: 'Verified listener count for the current session is unavailable',
    entryAriaCount: 'Verified listeners for the current session: {count}',
    openPanelAria: 'Open Runtime Inspector, {details}',
    refresh: 'Refresh',
    searchPlaceholder: 'Search ports, PIDs, apps, or sessions',
    closePanel: 'Close Runtime Inspector',
    actionManaged: 'Stop DSH task',
    actionExternal: 'End process',
    actionReadOnly: 'View only',
    actionManagedCompact: 'Can stop',
    actionExternalCompact: 'Can end',
    unknownProcess: 'Unidentified process',
    currentSession: 'Current DSH session',
    anotherSession: 'Another DSH session',
    sourceVerified: 'Started by DSH',
    sourceUnconfirmed: 'Starter unconfirmed',
    sourceDegraded: 'Attribution limited',
    sourceInferredTitle: 'DSH signal found; starter not confirmed',
    sourceVerifiedCurrent: 'This listener was started by the current session, and DSH verified its identity.',
    sourceVerifiedAnother: 'This listener was started by another DSH session, and DSH verified its identity.',
    sourceInferredDescription: 'A DSH signal was found, but the starter is not confirmed.',
    sourceUnattributedDescription: 'The current scan did not confirm the starter.',
    sourceDegradedDescription: 'Attribution is currently unavailable; this state does not determine the origin of an individual process.',
    composeAssociation: 'Compose project association confirmed',
    composeDetails: 'Compose runtime evidence',
    composeFile: 'Compose file',
    composeService: 'Service',
    composeImage: 'Image',
    composeContainer: 'Container ID',
    composeMapping: 'Port mapping',
    handlingScanIncomplete: 'This listener scan is incomplete, so the current result is view-only.',
    handlingDegraded: 'Attribution is unavailable; this listener is currently view-only.',
    handlingManaged: 'Stop through the DSH lifecycle; Host revalidates the current identity before execution.',
    handlingExternal: 'This action is independent of DSH attribution; Host revalidates the PID, creation time, executable, and listening port before execution.',
    handlingIdentityIncomplete: 'Process identity is incomplete, so the system will not end the process.',
    handlingReadOnly: 'This listener is currently view-only.',
    handlingComposeReadOnly: 'This Compose service is associated with the current project; Docker Desktop proxy ports are view-only and will not be terminated directly.',
    openDirectorySuccess: 'Project directory opened.',
    openDirectoryListenerNotFound: 'The listener no longer exists; refresh and try again.',
    openDirectoryProjectUnavailable: 'The project directory is unavailable.',
    openDirectoryOpenerUnavailable: 'Opening project directories is not supported in this environment.',
    openDirectoryFailed: 'Could not open the project directory.',
    selectPortPid: 'Select port {port}, PID {pid}',
    pidValue: 'PID {pid}',
    port: 'Port {port}',
    sameListenerRecordsTitle: '{count} identical listener records',
    unpinPort: 'Unpin port {port}',
    pinPort: 'Pin port {port}',
    unpinDisplay: 'Unpin display',
    pinDisplay: 'Pin display',
    noListeners: 'No listening ports',
    selectListener: 'Select a listening port',
    emptyRefreshCopy: 'Refresh to read the listening state visible to the current DSH session.',
    emptySelectCopy: 'Select an item from the list to inspect its attribution, session, and handling.',
    copyPortDetails: 'Copy details for port {port}',
    openPortProjectDirectory: 'Open the project directory for port {port}',
    sectionRuntimeInfo: 'Runtime information',
    application: 'Application',
    pid: 'PID',
    listenAddress: 'Listening address',
    sameListener: 'Identical listener',
    records: ({ count }) => `${String(count)} record${Number(count) === 1 ? '' : 's'}`,
    createdAt: 'Created at',
    projectDirectory: 'Project directory',
    launchCommand: 'Launch command',
    launchChain: 'Verified launch chain',
    launchChainRoot: 'Root',
    launchChainIntermediate: 'Intermediate',
    launchChainListener: 'Listener',
    launchChainCommandUnavailable: 'Command line unavailable',
    sectionSessionContext: 'Session context',
    session: 'Session',
    sessionId: 'Session ID',
    callId: 'Call ID',
    userRequest: 'User request',
    sectionToolCall: 'Tool call',
    agentId: 'Agent ID',
    turnStep: 'Turn / Step',
    tool: 'Tool',
    rootCallId: 'Root Call ID',
    sectionSource: 'Attribution',
    workdir: 'Workdir',
    spawnType: 'Spawn type',
    lifecycle: 'DSH lifecycle',
    sectionHandling: 'Handling',
    confirmEndProcess: 'Confirm ending this process',
    confirmStopTask: 'Confirm stopping the DSH task',
    confirmEndProcessCopy: 'This directly affects a system process and is independent of DSH attribution. Host revalidates the process identity before execution.',
    confirmStopTaskCopy: 'This stops the current task through the DSH lifecycle. Host revalidates the current ownership before execution.',
    confirmIdentityNote: 'Confirm that the PID, creation time, and executable below still match the current target.',
    listenPort: 'Listening port',
    unavailable: 'Unavailable',
    cancel: 'Cancel',
    statusSourceLimited: 'Attribution limited',
    statusScanIncomplete: 'Scan incomplete',
    loadingListeners: 'Reading listening ports',
    panelUnavailable: 'Could not read listening ports.',
    refreshFailedStale: 'Refresh failed; showing the last successful result.',
    retry: 'Retry',
    technicalDetails: 'Technical details',
    searchLabel: 'Search occupied ports',
    sortLabel: 'Sort occupied ports',
    sortPort: 'Port',
    sortApplication: 'Application',
    sortPid: 'PID',
    sortProject: 'Project',
    sortSession: 'Session',
    sortDirection: 'Toggle sort direction',
    ascending: 'Ascending',
    descending: 'Descending',
    view: 'View',
    viewRange: 'View range',
    scopeDevelopment: 'Development',
    scopeAll: 'All',
    sourceFilter: 'Starter',
    sourceAll: 'All',
    sourceDsh: 'DSH',
    actionableOnly: 'Actionable',
    updatingPortStatus: 'Updating port status…',
    truncatedBanner: 'The result limit was reached; the list shows the currently visible portion.',
    listenerList: 'Listening port list',
    displayCount: ({ count }) => `Showing ${String(count)} listener${Number(count) === 1 ? '' : 's'}`,
    noDiscoveredListeners: 'No listening ports found',
    noMatch: 'No matches',
    noVisibleListeners: 'The current DSH session has no visible listening ports.',
    adjustSearch: 'Adjust the search or filters and try again.',
    groupCurrentProject: 'Current project',
    groupDevelopmentEnvironment: 'Development environment',
    groupPinned: 'Pinned',
    groupOther: 'Other listeners',
    searchScopeNote: 'Search includes all listeners, including background processes collapsed by default.',
    collapsedOther: ({ count }) => `${String(count)} other listener${Number(count) === 1 ? '' : 's'} collapsed`,
    detailColumn: 'Listening port details',
    detailsCopied: 'Details copied.',
    detailsGeneratedClipboardUnavailable: 'Details generated, but the clipboard is unavailable.',
    copyListenerNotFound: 'The listener no longer exists, so its details could not be copied.',
    copyFailed: 'Copy failed.',
    actionCompletedReleased: ({ action, port }) => `${String(action)} completed; port ${String(port)} is no longer listening.`,
    actionCompletedStillListening: ({ action, port }) => `${String(action)} completed, but port ${String(port)} is still listening.`,
    actionCompletedUnconfirmed: ({ action, port }) => `${String(action)} completed, but the fresh scan could not confirm whether port ${String(port)} was released.`,
    actionListenerNotFound: 'The listener no longer exists; refresh and try again.',
    actionNotAllowed: 'The requested action is not allowed for this listener.',
    actionConfirmationRequired: 'Explicit confirmation is required before this action.',
    actionOwnerUnavailable: 'The DSH lifecycle owner is no longer available.',
    actionDenied: 'The requested action was not performed.',
    actionFailed: ({ action, port }) => `${String(action)} failed; the state of port ${String(port)} was refreshed.`,
    actionRequestFailed: ({ action, port }) => `${String(action)} failed; the latest state of port ${String(port)} could not be confirmed.`,
  },
}

export function normalizeRuntimeInspectorLocale(value: unknown): RuntimeInspectorLocale | undefined {
  if (value === 'zh' || value === 'en') return value
  return undefined
}

function normalizeDocumentLanguage(value: unknown): RuntimeInspectorLocale {
  if (typeof value !== 'string') return 'en'
  const language = value.trim().toLowerCase()
  if (language === 'zh' || language.startsWith('zh-')) return 'zh'
  if (language === 'en' || language.startsWith('en-')) return 'en'
  return 'en'
}

function readDocumentLanguage(): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.documentElement?.lang || undefined
}

function readActiveLocale(source: RuntimeInspectorLocaleSource): { readonly present: boolean; readonly locale?: RuntimeInspectorLocale } {
  const getters = [source.getSnapshot, source.getLocale]
  for (const getter of getters) {
    if (typeof getter !== 'function') continue
    try {
      const snapshot = getter.call(source)
      if (snapshot !== undefined && snapshot.active !== undefined) {
        return { present: true, locale: normalizeRuntimeInspectorLocale(snapshot.active) }
      }
    } catch {
      // A missing or temporarily unavailable DSH locale service is handled by the DOM fallback.
    }
  }
  return { present: false }
}

function readLocaleSource(context: RuntimeInspectorLocaleContext | undefined): RuntimeInspectorLocaleSource | undefined {
  if (context === undefined) return undefined
  if (typeof context.get === 'function') {
    try {
      const source = context.get('locale')
      if (source !== undefined) return source as RuntimeInspectorLocaleSource
    } catch {
      // Try the structural property below when optional Cordis lookup is unavailable.
    }
  }
  try {
    return context.locale
  } catch {
    return undefined
  }
}

export function createRuntimeInspectorLocaleStore(
  context: RuntimeInspectorLocaleContext | undefined,
  documentLanguageReader: () => string | undefined = readDocumentLanguage,
): RuntimeInspectorLocaleStore {
  return {
    getSnapshot: () => {
      const source = readLocaleSource(context)
      if (source !== undefined) {
        const active = readActiveLocale(source)
        if (active.present) return active.locale ?? 'en'
      }
      return normalizeDocumentLanguage(documentLanguageReader())
    },
    subscribe: (listener) => {
      const source = readLocaleSource(context)
      const subscribe = source?.subscribe
      if (typeof subscribe !== 'function') return () => undefined
      try {
        return subscribe.call(source, listener)
      } catch {
        return () => undefined
      }
    },
  }
}

export function createRuntimeInspectorTranslator(locale: RuntimeInspectorLocale): RuntimeInspectorTranslator {
  return {
    locale,
    t: (key, values = {}) => {
      const message = messages[locale][key]
      return typeof message === 'function'
        ? message(values)
        : message.replace(/\{([a-zA-Z0-9_]+)\}/gu, (placeholder, name: string) => {
          const value = values[name]
          return value === undefined ? placeholder : String(value)
        })
    },
  }
}
