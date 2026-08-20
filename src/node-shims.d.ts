declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string
}

declare module 'node:process' {
  export const platform: string
}

declare module 'node:module' {
  interface RequireFunction {
    (id: string): unknown
    resolve(id: string): string
  }

  export function createRequire(url: string): RequireFunction
}
