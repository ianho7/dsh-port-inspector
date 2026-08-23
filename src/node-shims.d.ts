declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string
}

declare module 'node:child_process' {
  export function spawnSync(
    file: string,
    args?: readonly string[],
    options?: { readonly encoding?: string; readonly windowsHide?: boolean },
  ): { readonly stdout?: unknown; readonly stderr?: unknown; readonly status?: number; readonly error?: unknown }
}

declare module 'node:process' {
  export const argv: readonly string[]
  export const platform: string
}

declare module 'node:path' {
  export function dirname(path: string): string
  export function join(...paths: readonly string[]): string
}

declare module 'node:async_hooks' {
  export class AsyncLocalStorage<T> {
    run<R>(store: T, callback: () => R): R
    getStore(): T | undefined
  }
}

declare module 'node:module' {
  interface RequireFunction {
    (id: string): unknown
    resolve(id: string): string
  }

  export function createRequire(url: string): RequireFunction
}
