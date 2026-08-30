import type {
  HostActionResult,
  HostCopyResult,
  HostOpenDirectoryResult,
} from '../host-ui.js'
import type { RuntimeInspectorTranslator } from './i18n.js'

export type NoticeTone = 'success' | 'warning' | 'error'
export type NoticeSource = 'inventory' | 'copy' | 'open-directory' | 'action'

export interface PanelNotice {
  readonly tone: NoticeTone
  readonly source: NoticeSource
  readonly message: string
  readonly detail?: string
  readonly listenerId?: string
  readonly port?: number
}

export type OperationNoticePlacement = 'inline' | 'detached'

export const MAX_NOTICE_DETAIL_LENGTH = 1_024
export const NOTICE_AUTO_DISMISS_MS = 4_000

function frozenNotice(notice: PanelNotice): PanelNotice {
  return Object.freeze(notice)
}

/** Keep one bounded message line; never surface an Error stack in the panel. */
export function boundedNoticeDetail(value: unknown): string | undefined {
  const candidate = value instanceof Error
    ? value.message
    : typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value)
  const firstLine = candidate.split(/\r?\n/u).find(line => line.trim().length > 0)?.trim()
  if (firstLine === undefined || firstLine.length === 0) return undefined
  return firstLine.length > MAX_NOTICE_DETAIL_LENGTH
    ? `${firstLine.slice(0, MAX_NOTICE_DETAIL_LENGTH - 1)}…`
    : firstLine
}

export function inventoryFailureNotice(
  hasSnapshot: boolean,
  error: unknown,
  t: RuntimeInspectorTranslator['t'],
): PanelNotice {
  const detail = boundedNoticeDetail(error)
  return frozenNotice({
    tone: hasSnapshot ? 'warning' : 'error',
    source: 'inventory',
    message: hasSnapshot ? t('refreshFailedStale') : t('panelUnavailable'),
    ...detail === undefined ? {} : { detail },
  })
}

export function operationNoticePlacement(
  notice: PanelNotice | undefined,
  selectedListenerId: string | undefined,
): OperationNoticePlacement | undefined {
  if (notice === undefined) return undefined
  return notice.listenerId === selectedListenerId ? 'inline' : 'detached'
}

/** Only lightweight success confirmations disappear without user action. */
export function noticeAutoDismissMs(notice: PanelNotice | undefined): number | undefined {
  if (notice === undefined || notice.tone !== 'success') return undefined
  return notice.source === 'copy' || notice.source === 'open-directory'
    ? NOTICE_AUTO_DISMISS_MS
    : undefined
}

export function copyResultNotice(
  result: HostCopyResult,
  listenerId: string,
  port: number,
  t: RuntimeInspectorTranslator['t'],
): PanelNotice {
  if (result.ok && result.copied) {
    return frozenNotice({ tone: 'success', source: 'copy', message: t('detailsCopied'), listenerId, port })
  }
  if (result.ok) {
    return frozenNotice({ tone: 'warning', source: 'copy', message: t('detailsGeneratedClipboardUnavailable'), listenerId, port })
  }
  const warning = result.reason === 'listener-not-found'
  const detail = boundedNoticeDetail(result.error)
  return frozenNotice({
    tone: warning ? 'warning' : 'error',
    source: 'copy',
    message: warning ? t('copyListenerNotFound') : t('copyFailed'),
    listenerId,
    port,
    ...detail === undefined ? {} : { detail },
  })
}

export function copyRequestFailureNotice(
  listenerId: string,
  port: number,
  error: unknown,
  t: RuntimeInspectorTranslator['t'],
): PanelNotice {
  const detail = boundedNoticeDetail(error)
  return frozenNotice({
    tone: 'error',
    source: 'copy',
    message: t('copyFailed'),
    listenerId,
    port,
    ...detail === undefined ? {} : { detail },
  })
}

export function openDirectoryResultNotice(
  result: HostOpenDirectoryResult,
  listenerId: string,
  port: number,
  t: RuntimeInspectorTranslator['t'],
): PanelNotice {
  if (result.ok) {
    return frozenNotice({ tone: 'success', source: 'open-directory', message: t('openDirectorySuccess'), listenerId, port })
  }
  const warning = result.reason !== 'open-failed'
  const message = (() => {
    switch (result.reason) {
      case 'listener-not-found': return t('openDirectoryListenerNotFound')
      case 'project-unavailable': return t('openDirectoryProjectUnavailable')
      case 'opener-unavailable': return t('openDirectoryOpenerUnavailable')
      case 'open-failed': return t('openDirectoryFailed')
      default: return t('openDirectoryFailed')
    }
  })()
  const detail = boundedNoticeDetail(result.error)
  return frozenNotice({
    tone: warning ? 'warning' : 'error',
    source: 'open-directory',
    message,
    listenerId,
    port,
    ...detail === undefined ? {} : { detail },
  })
}

export function openDirectoryRequestFailureNotice(
  listenerId: string,
  port: number,
  error: unknown,
  t: RuntimeInspectorTranslator['t'],
): PanelNotice {
  const detail = boundedNoticeDetail(error)
  return frozenNotice({
    tone: 'error',
    source: 'open-directory',
    message: t('openDirectoryFailed'),
    listenerId,
    port,
    ...detail === undefined ? {} : { detail },
  })
}

export function actionResultNotice(
  result: HostActionResult,
  action: string,
  t: RuntimeInspectorTranslator['t'],
): PanelNotice {
  const port = result.port
  const portLabel = port === undefined ? '—' : String(port)
  if (result.status === 'completed' && result.ok) {
    const message = result.portReleased === true
      ? t('actionCompletedReleased', { action, port: portLabel })
      : result.portReleased === false
        ? t('actionCompletedStillListening', { action, port: portLabel })
        : t('actionCompletedUnconfirmed', { action, port: portLabel })
    return frozenNotice({
      tone: result.portReleased === true ? 'success' : 'warning',
      source: 'action',
      message,
      listenerId: result.listenerId,
      ...port === undefined ? {} : { port },
    })
  }
  if (result.status === 'denied') {
    const message = (() => {
      switch (result.reason) {
        case 'listener-not-found': return t('actionListenerNotFound')
        case 'action-not-allowed': return t('actionNotAllowed')
        case 'confirmation-required': return t('actionConfirmationRequired')
        case 'managed-owner-unavailable': return t('actionOwnerUnavailable')
        default: return t('actionDenied')
      }
    })()
    return frozenNotice({
      tone: 'warning',
      source: 'action',
      message,
      listenerId: result.listenerId,
      ...port === undefined ? {} : { port },
    })
  }
  const detail = boundedNoticeDetail(result.managed?.error ?? result.external?.error ?? result.message)
  return frozenNotice({
    tone: 'error',
    source: 'action',
    message: t('actionFailed', { action, port: portLabel }),
    listenerId: result.listenerId,
    ...port === undefined ? {} : { port },
    ...detail === undefined ? {} : { detail },
  })
}

export function actionRequestFailureNotice(
  listenerId: string,
  port: number | undefined,
  action: string,
  error: unknown,
  t: RuntimeInspectorTranslator['t'],
): PanelNotice {
  const detail = boundedNoticeDetail(error)
  return frozenNotice({
    tone: 'error',
    source: 'action',
    message: t('actionRequestFailed', { action, port: port === undefined ? '—' : String(port) }),
    listenerId,
    ...port === undefined ? {} : { port },
    ...detail === undefined ? {} : { detail },
  })
}
