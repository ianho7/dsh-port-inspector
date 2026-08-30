interface DshOpenPathRequest {
  readonly rpcId: string
  readonly payload: { readonly path: string }
}

interface DshApiProxyHostLike {
  readonly openPath?: (request: DshOpenPathRequest, signal: AbortSignal) => Promise<unknown>
}

export interface RuntimeInspectorDshAdapters {
  readonly openDirectoryAvailable: () => boolean
  readonly openDirectory: (path: string) => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOpenPath(readApiProxy: () => unknown): DshApiProxyHostLike['openPath'] | undefined {
  try {
    const apiProxy = readApiProxy()
    if (!isRecord(apiProxy) || !isRecord(apiProxy.host) || typeof apiProxy.host.openPath !== 'function') return undefined
    return apiProxy.host.openPath as DshApiProxyHostLike['openPath']
  } catch {
    return undefined
  }
}

/** Adapt the certified Stock DSH Host path opener without exposing it to Browser code. */
export function createRuntimeInspectorDshAdapters(readApiProxy: () => unknown): RuntimeInspectorDshAdapters {
  let requestSequence = 0
  const openDirectoryAvailable = (): boolean => readOpenPath(readApiProxy) !== undefined
  const openDirectory = async (path: string): Promise<void> => {
    const openPath = readOpenPath(readApiProxy)
    if (openPath === undefined) throw new Error('Host path opener unavailable')
    const response = await openPath({
      rpcId: `dsh-port-inspector:${Date.now()}:${requestSequence++}`,
      payload: { path },
    }, new AbortController().signal)
    const result = isRecord(response) ? response.result : undefined
    if (isRecord(result) && result.ok === true) return
    const error = isRecord(result) && isRecord(result.error) && typeof result.error.message === 'string'
      ? result.error.message
      : 'Host path opener failed'
    throw new Error(error)
  }
  return Object.freeze({ openDirectoryAvailable, openDirectory })
}
