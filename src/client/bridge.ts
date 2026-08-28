import type {
  HostActionRequest,
  HostActionResult,
  HostCopyResult,
  HostInventoryQuery,
  HostInventorySnapshot,
  HostOpenDirectoryResult,
  HostListenerRequest,
} from '../host-ui.js'
import { writeRuntimeInspectorClipboard } from './clipboard.js'
import { RUNTIME_INSPECTOR_ROUTE } from '../runtime-inspector-route.js'

/** Same-origin route; the Browser half never receives a process primitive. */
export const RUNTIME_INSPECTOR_BROWSER_ROUTE = RUNTIME_INSPECTOR_ROUTE

export interface RuntimeInspectorBrowserRpc {
  readonly inventory: (query?: HostInventoryQuery) => Promise<HostInventorySnapshot>
  readonly copyDetails: (request: HostListenerRequest) => Promise<HostCopyResult>
  readonly openProjectDirectory: (request: HostListenerRequest) => Promise<HostOpenDirectoryResult>
  readonly performAction: (request: HostActionRequest) => Promise<HostActionResult>
}

export interface RuntimeInspectorFetchResponse {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
}

export type RuntimeInspectorFetcher = (
  input: string,
  init: {
    readonly method: 'POST'
    readonly headers: Readonly<Record<string, string>>
    readonly credentials: 'same-origin'
    readonly body: string
  },
) => Promise<RuntimeInspectorFetchResponse>

export type RuntimeInspectorClipboardWriter = (text: string) => Promise<boolean>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function request<T>(
  fetcher: RuntimeInspectorFetcher,
  route: string,
  endpoint: string,
  body: unknown,
): Promise<T> {
  const response = await fetcher(`${route}/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body ?? null),
  })
  const value = await response.json()
  if (!response.ok) {
    const message = isRecord(value) && typeof value.error === 'string' ? value.error : `Host request failed (${String(response.status)})`
    throw new Error(message)
  }
  if (!isRecord(value)) throw new Error('Host returned a non-serializable response')
  return value as T
}

/** Create the only Browser-facing capability used by the Runtime Inspector panel. */
export function createRuntimeInspectorBrowserRpc(
  fetcher: RuntimeInspectorFetcher = ((input, init) => fetch(input, init) as Promise<RuntimeInspectorFetchResponse>),
  route = RUNTIME_INSPECTOR_BROWSER_ROUTE,
  clipboard: RuntimeInspectorClipboardWriter = (text) => writeRuntimeInspectorClipboard(text),
): RuntimeInspectorBrowserRpc {
  return {
    inventory: query => request<HostInventorySnapshot>(fetcher, route, 'inventory', query),
    copyDetails: async requestData => {
      const result = await request<HostCopyResult>(fetcher, route, 'copy', requestData)
      if (!result.ok || result.copied) return result
      let copied = false
      try {
        copied = await clipboard(result.text)
      } catch {
        copied = false
      }
      return Object.freeze({ ...result, copied })
    },
    openProjectDirectory: requestData => request<HostOpenDirectoryResult>(fetcher, route, 'open-project-directory', requestData),
    performAction: requestData => request<HostActionResult>(fetcher, route, 'action', requestData),
  }
}
