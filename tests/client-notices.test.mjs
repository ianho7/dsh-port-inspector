import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_NOTICE_DETAIL_LENGTH,
  NOTICE_AUTO_DISMISS_MS,
  actionRequestFailureNotice,
  actionResultNotice,
  boundedNoticeDetail,
  copyRequestFailureNotice,
  copyResultNotice,
  inventoryFailureNotice,
  openDirectoryRequestFailureNotice,
  openDirectoryResultNotice,
  noticeAutoDismissMs,
  operationNoticePlacement,
} from '../lib/client/notices.js'
import { createRuntimeInspectorTranslator } from '../lib/client/i18n.js'

const t = createRuntimeInspectorTranslator('zh').t
const snapshot = Object.freeze({
  mode: 'observing',
  scanComplete: true,
  truncated: false,
  listeners: Object.freeze([]),
})

function action(overrides = {}) {
  return {
    ok: true,
    action: 'managed-shutdown',
    status: 'completed',
    listenerId: 'listener-a',
    port: 5173,
    portReleased: true,
    scanComplete: true,
    freshScan: snapshot,
    message: 'completed',
    ...overrides,
  }
}

test('inventory failures distinguish an unavailable panel from a stale refresh', () => {
  assert.deepEqual(inventoryFailureNotice(false, new Error('bridge down'), t), {
    tone: 'error',
    source: 'inventory',
    message: '无法读取监听端口。',
    detail: 'bridge down',
  })
  assert.deepEqual(inventoryFailureNotice(true, new Error('bridge down'), t), {
    tone: 'warning',
    source: 'inventory',
    message: '刷新失败，当前显示上次成功结果。',
    detail: 'bridge down',
  })
})

test('copy and directory notices preserve operation scope and severity', () => {
  assert.equal(copyResultNotice({ ok: true, text: 'x', copied: true }, 'listener-a', 5173, t).tone, 'success')
  assert.equal(copyResultNotice({ ok: true, text: 'x', copied: false }, 'listener-a', 5173, t).tone, 'warning')
  assert.equal(copyResultNotice({ ok: false, text: '', copied: false, reason: 'listener-not-found' }, 'listener-a', 5173, t).tone, 'warning')
  assert.equal(copyResultNotice({ ok: false, text: '', copied: false, reason: 'clipboard-failed', error: 'denied' }, 'listener-a', 5173, t).tone, 'error')
  assert.equal(copyRequestFailureNotice('listener-a', 5173, new Error('transport'), t).source, 'copy')

  assert.equal(openDirectoryResultNotice({ ok: true }, 'listener-a', 5173, t).tone, 'success')
  assert.equal(openDirectoryResultNotice({ ok: false, reason: 'project-unavailable' }, 'listener-a', 5173, t).tone, 'warning')
  assert.equal(openDirectoryResultNotice({ ok: false, reason: 'open-failed', error: 'denied' }, 'listener-a', 5173, t).tone, 'error')
  assert.equal(openDirectoryRequestFailureNotice('listener-a', 5173, new Error('transport'), t).source, 'open-directory')
})

test('action notices distinguish released, uncertain, denied, and failed outcomes', () => {
  assert.equal(actionResultNotice(action(), '停止 DSH 任务', t).tone, 'success')
  assert.equal(actionResultNotice(action({ portReleased: false }), '停止 DSH 任务', t).tone, 'warning')
  assert.equal(actionResultNotice(action({ portReleased: undefined }), '停止 DSH 任务', t).tone, 'warning')
  assert.equal(actionResultNotice(action({ ok: false, status: 'denied', reason: 'action-not-allowed' }), '停止 DSH 任务', t).tone, 'warning')
  const failed = actionResultNotice(action({ ok: false, status: 'failed', message: 'owner failed' }), '停止 DSH 任务', t)
  assert.equal(failed.tone, 'error')
  assert.equal(failed.detail, 'owner failed')
  assert.equal(actionRequestFailureNotice('listener-a', 5173, '停止 DSH 任务', new Error('transport'), t).tone, 'error')
  assert.match(
    actionRequestFailureNotice('listener-a', 5173, '停止 DSH 任务', new Error('transport'), t).message,
    /无法确认端口 5173 的最新状态/u,
  )
})

test('operation notices detach instead of attaching to a newly selected listener', () => {
  const notice = copyResultNotice({ ok: true, text: 'x', copied: true }, 'listener-a', 5173, t)
  assert.equal(operationNoticePlacement(notice, 'listener-a'), 'inline')
  assert.equal(operationNoticePlacement(notice, 'listener-b'), 'detached')
  assert.equal(operationNoticePlacement(notice, undefined), 'detached')
  assert.equal(operationNoticePlacement(undefined, 'listener-a'), undefined)
})

test('only lightweight success notices opt into automatic dismissal', () => {
  const copySuccess = copyResultNotice({ ok: true, text: 'x', copied: true }, 'listener-a', 5173, t)
  const directorySuccess = openDirectoryResultNotice({ ok: true }, 'listener-a', 5173, t)
  const copyWarning = copyResultNotice({ ok: true, text: 'x', copied: false }, 'listener-a', 5173, t)
  const actionSuccess = actionResultNotice(action(), '停止 DSH 任务', t)

  assert.equal(noticeAutoDismissMs(copySuccess), NOTICE_AUTO_DISMISS_MS)
  assert.equal(noticeAutoDismissMs(directorySuccess), NOTICE_AUTO_DISMISS_MS)
  assert.equal(noticeAutoDismissMs(copyWarning), undefined)
  assert.equal(noticeAutoDismissMs(actionSuccess), undefined)
})

test('technical notice details keep one bounded message line and omit Error stacks', () => {
  const error = new Error('first line')
  error.stack = 'first line\nstack detail'
  assert.equal(boundedNoticeDetail(error), 'first line')
  assert.equal(boundedNoticeDetail('first line\nsecond line'), 'first line')
  const bounded = boundedNoticeDetail('x'.repeat(MAX_NOTICE_DETAIL_LENGTH + 20))
  assert.equal(bounded?.length, MAX_NOTICE_DETAIL_LENGTH)
  assert.equal(bounded?.endsWith('…'), true)
})
