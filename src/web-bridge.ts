import type {
  HostActionRequest,
  HostActionResult,
  HostCopyResult,
  HostInventoryQuery,
  HostInventorySnapshot,
  HostOpenDirectoryResult,
  RuntimeInspectorHostRpc,
} from './host-ui.js'
import { RUNTIME_INSPECTOR_ROUTE } from './runtime-inspector-route.js'

export { RUNTIME_INSPECTOR_ROUTE } from './runtime-inspector-route.js'

/** Stable same-origin route used by the Browser half when no typed Remote exists. */
const MAX_BODY_BYTES = 128 * 1024

export interface RuntimeInspectorWebRoute {
  readonly kind: 'prefix'
  readonly path: typeof RUNTIME_INSPECTOR_ROUTE
  readonly handler: (request: RuntimeInspectorWebRequest, response: RuntimeInspectorWebResponse) => void | Promise<void>
}

/** Minimal HTTP request surface needed by the route adapter. */
export interface RuntimeInspectorWebRequest {
  readonly method?: string
  readonly url?: string
  on(event: 'data' | 'end' | 'error', listener: (...args: readonly unknown[]) => void): unknown
}

/** Minimal HTTP response surface needed by the route adapter. */
export interface RuntimeInspectorWebResponse {
  writeHead(status: number, headers?: Readonly<Record<string, string>>): void
  end(body?: string): void
}

export interface RuntimeInspectorWebServer {
  register(route: RuntimeInspectorWebRoute): () => void
}

export type RuntimeInspectorWebEndpoint = 'inventory' | 'copy' | 'open-project-directory' | 'action'

export interface RuntimeInspectorWebResponseBody {
  readonly status: number
  readonly body: HostInventorySnapshot | HostCopyResult | HostOpenDirectoryResult | HostActionResult | { readonly error: string }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, field: string): string {
  if (!isRecord(value) || typeof value[field] !== 'string' || value[field].length === 0) {
    throw new Error(`invalid ${field}`)
  }
  return value[field] as string
}

function readBodyRequest(value: unknown): { readonly listenerId: string } {
  return { listenerId: readString(value, 'listenerId') }
}

function readActionRequest(value: unknown): HostActionRequest {
  if (!isRecord(value)) throw new Error('invalid action request')
  const listenerId = readString(value, 'listenerId')
  const kind = value.kind
  if (kind !== 'managed-shutdown' && kind !== 'external-single-pid' && kind !== 'read-only' && kind !== 'degraded') {
    throw new Error('invalid action kind')
  }
  if (value.confirmed !== undefined && typeof value.confirmed !== 'boolean') {
    throw new Error('invalid confirmation')
  }
  return {
    listenerId,
    kind,
    ...value.confirmed === undefined ? {} : { confirmed: value.confirmed },
  }
}

function readQuery(value: unknown): HostInventoryQuery | undefined {
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) throw new Error('invalid inventory query')
  const query: { search?: string; sort?: { key: 'port' | 'application' | 'pid' | 'project' | 'session'; direction?: 'asc' | 'desc' } } = {}
  if (value.search !== undefined) {
    if (typeof value.search !== 'string') throw new Error('invalid search')
    query.search = value.search
  }
  if (value.sort !== undefined) {
    if (!isRecord(value.sort)) throw new Error('invalid inventory sort')
    const key = value.sort.key
    if (key !== 'port' && key !== 'application' && key !== 'pid' && key !== 'project' && key !== 'session') {
      throw new Error('invalid inventory sort key')
    }
    const direction = value.sort.direction
    if (direction !== undefined && direction !== 'asc' && direction !== 'desc') {
      throw new Error('invalid inventory sort direction')
    }
    query.sort = { key, ...direction === undefined ? {} : { direction } }
  }
  return query
}

function endpointFromPath(pathname: string): RuntimeInspectorWebEndpoint | undefined {
  if (!pathname.startsWith(`${RUNTIME_INSPECTOR_ROUTE}/`)) return undefined
  const endpoint = pathname.slice(RUNTIME_INSPECTOR_ROUTE.length + 1)
  return endpoint === 'inventory' || endpoint === 'copy' || endpoint === 'open-project-directory' || endpoint === 'action'
    ? endpoint
    : undefined
}

/** Dispatch the narrow Browser-to-Host contract without exposing Host internals. */
export async function dispatchRuntimeInspectorRequest(
  host: RuntimeInspectorHostRpc,
  method: string | undefined,
  pathname: string,
  body: unknown,
): Promise<RuntimeInspectorWebResponseBody> {
  if (method !== 'POST') return { status: 405, body: { error: 'method not allowed' } }
  const endpoint = endpointFromPath(pathname)
  if (endpoint === undefined) return { status: 404, body: { error: 'not found' } }
  try {
    switch (endpoint) {
      case 'inventory':
        return { status: 200, body: host.inventory(readQuery(body)) }
      case 'copy':
        return { status: 200, body: await host.copyDetails(readBodyRequest(body)) }
      case 'open-project-directory':
        return { status: 200, body: await host.openProjectDirectory(readBodyRequest(body)) }
      case 'action':
        return { status: 200, body: await host.performAction(readActionRequest(body)) }
    }
  } catch (error) {
    return { status: 400, body: { error: error instanceof Error ? error.message : String(error) } }
  }
}

function readRequestBody(request: RuntimeInspectorWebRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0
    let content = ''
    request.on('data', (chunk) => {
      const text = typeof chunk === 'string' ? chunk : chunk instanceof Uint8Array ? new TextDecoder().decode(chunk) : String(chunk)
      size += text.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request body too large'))
        return
      }
      content += text
    })
    request.on('error', (error) => { reject(error) })
    request.on('end', () => {
      if (content.length === 0) {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(content) as unknown)
      } catch {
        reject(new Error('request body is not valid JSON'))
      }
    })
  })
}

/** Adapt the serializable RPC dispatcher to the stock DSH WebServer route contract. */
export function createRuntimeInspectorWebRoute(host: RuntimeInspectorHostRpc): RuntimeInspectorWebRoute {
  return {
    kind: 'prefix',
    path: RUNTIME_INSPECTOR_ROUTE,
    handler: async (request, response) => {
      let result: RuntimeInspectorWebResponseBody
      try {
        const pathname = new URL(request.url ?? '/', 'http://dsh.local').pathname
        result = await dispatchRuntimeInspectorRequest(host, request.method, pathname, await readRequestBody(request))
      } catch (error) {
        result = { status: 400, body: { error: error instanceof Error ? error.message : String(error) } }
      }
      response.writeHead(result.status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      response.end(JSON.stringify(result.body))
    },
  }
}
