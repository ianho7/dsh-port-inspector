export const PINNED_LISTENERS_STORAGE_KEY = 'dsh-runtime-inspector:pins:v1'

export interface ListenerPinStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function browserStorage(): ListenerPinStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function validStableKey(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 240
    && /^(?:application|project):/u.test(value)
}

export function loadPinnedListenerKeys(storage: ListenerPinStorage | undefined = browserStorage()): ReadonlySet<string> {
  if (storage === undefined) return new Set()
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PINNED_LISTENERS_STORAGE_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return new Set()
    const value = parsed as { readonly version?: unknown; readonly keys?: unknown }
    if (value.version !== 1 || !Array.isArray(value.keys)) return new Set()
    return new Set(value.keys.filter(validStableKey).slice(0, 100))
  } catch {
    return new Set()
  }
}

export function savePinnedListenerKeys(
  storage: ListenerPinStorage | undefined,
  keys: ReadonlySet<string>,
): boolean {
  const target = storage ?? browserStorage()
  if (target === undefined) return false
  try {
    target.setItem(PINNED_LISTENERS_STORAGE_KEY, JSON.stringify({
      version: 1,
      keys: [...keys].filter(validStableKey).slice(0, 100),
    }))
    return true
  } catch {
    return false
  }
}

export function togglePinnedListenerKey(keys: ReadonlySet<string>, stableKey: string): ReadonlySet<string> {
  const next = new Set(keys)
  if (next.has(stableKey)) next.delete(stableKey)
  else if (validStableKey(stableKey) && next.size < 100) next.add(stableKey)
  return next
}
