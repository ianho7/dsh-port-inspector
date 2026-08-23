import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { argv } from 'node:process'

interface PackageManifest {
  readonly name?: unknown
  readonly version?: unknown
}

const require = createRequire(import.meta.url)

function manifestAt(path: string): PackageManifest | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PackageManifest
  } catch {
    return undefined
  }
}

/** Resolve the package owning the actual CLI entry, independent of plugin module lookup. */
export function readDshVersionNearEntry(entryFile: string | undefined): string | undefined {
  if (typeof entryFile !== 'string' || entryFile.length === 0) return undefined
  let current = dirname(entryFile)
  for (let depth = 0; depth < 8; depth += 1) {
    const manifest = manifestAt(join(current, 'package.json'))
    if (manifest?.name === '@deepseek-ai/dsh' && typeof manifest.version === 'string') return manifest.version
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return undefined
}

/**
 * Read the installed DSH package version without importing an application
 * service. Prefer the running CLI package; the agent package is a compatibility
 * fallback for profiles whose module graph does not expose the CLI package
 * from the Bundle's resolution path.
 */
export function readInstalledDshVersion(): string | undefined {
  try {
    const runningVersion = readDshVersionNearEntry(argv[1])
    if (runningVersion !== undefined) return runningVersion
    for (const packageName of ['@deepseek-ai/dsh/package.json', '@deepseek-ai/dsh-agent/package.json']) {
      try {
        const manifestPath = require.resolve(packageName)
        const manifest = manifestAt(manifestPath)
        if (typeof manifest?.version === 'string') return manifest.version
      } catch {
        // Try the next known DSH package identity.
      }
    }
    return undefined
  } catch {
    return undefined
  }
}
