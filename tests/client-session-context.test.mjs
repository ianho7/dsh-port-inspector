import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRuntimeInspectorSessionContext,
  formatProcessCreatedAt,
} from '../lib/client/session-context.js'

test('formats Windows FILETIME for people while preserving ordinary display values', () => {
  const formatted = formatProcessCreatedAt('134319632994565251')
  assert.notEqual(formatted, '134319632994565251')
  assert.match(formatted, /2026/)
  assert.equal(formatProcessCreatedAt('not-a-time'), 'not-a-time')
  assert.equal(formatProcessCreatedAt(undefined), '—')
})

test('formats process creation time in the selected UI locale', () => {
  const value = '134319632994565251'
  const zh = formatProcessCreatedAt(value, 'zh')
  const en = formatProcessCreatedAt(value, 'en')
  assert.notEqual(zh, en)
  assert.match(zh, /2026/)
  assert.match(en, /2026/)
})

test('projects the selected DSH session title, cwd, and the user request that initiated a Call ID', () => {
  const context = buildRuntimeInspectorSessionContext({
    sessionId: 'session-a',
    title: '启动预览服务',
    cwd: 'D:\\project\\demo',
    conversation: {
      nodes: [
        { kind: 'user', seq: 1, content: [{ type: 'text', text: '请启动 4173 端口的本地服务' }] },
        { kind: 'assistant', seq: 2, turn: 4, blocks: [{ kind: 'tool-call', callId: 'call-4173', name: 'run_code', argsRaw: '{}' }] },
      ],
      runningCalls: [],
    },
  })

  assert.equal(context.sessionId, 'session-a')
  assert.equal(context.title, '启动预览服务')
  assert.equal(context.cwd, 'D:\\project\\demo')
  assert.equal(context.requestFor({ sessionId: 'session-a', callId: 'call-4173', turn: 4 }), '请启动 4173 端口的本地服务')
  assert.equal(context.requestFor({ sessionId: 'session-a', callId: 'call-4173:code:1', rootCallId: 'call-4173', turn: 4 }), '请启动 4173 端口的本地服务')
})

test('never projects another session request onto a listener row', () => {
  const context = buildRuntimeInspectorSessionContext({
    sessionId: 'session-a',
    title: 'Current',
    conversation: {
      nodes: [{ kind: 'user', seq: 1, content: [{ type: 'text', text: 'private request' }] }],
      runningCalls: [],
    },
  })

  assert.equal(context.requestFor({ sessionId: 'session-b', callId: 'call-b', turn: 1 }), undefined)
})

test('never projects the current request onto an unattributed external listener', () => {
  const context = buildRuntimeInspectorSessionContext({
    sessionId: 'session-a',
    title: '本地服务调试',
    conversation: {
      nodes: [
        { kind: 'user', seq: 1, content: [{ type: 'text', text: '请启动 4173 端口的本地服务' }] },
        { kind: 'assistant', seq: 2, turn: 4, blocks: [{ kind: 'tool-call', callId: 'call-4173', name: 'run_code', argsRaw: '{}' }] },
      ],
      runningCalls: [],
    },
  })

  // This is the exact context shape of a PowerShell-started listener row:
  // no DSH Session, Call ID, root Call ID, or Turn attribution exists.
  assert.equal(context.requestFor({}), undefined)
})
