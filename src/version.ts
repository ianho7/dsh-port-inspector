import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

interface PackageManifest {
  readonly version?: unknown
}

const require = createRequire(import.meta.url)

/**
 * Read the installed DSH package version without importing an application
 * service. Prefer the running CLI package; the agent package is a compatibility
 * fallback for profiles whose module graph does not expose the CLI package
 * from the Bundle's resolution path.
 */
export function readInstalledDshVersion(): string | undefined {
  try {
    for (const packageName of ['@deepseek-ai/dsh/package.json', '@deepseek-ai/dsh-agent/package.json']) {
      try {
        const manifestPath = require.resolve(packageName)
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest
        if (typeof manifest.version === 'string') return manifest.version
      } catch {
        // Try the next known DSH package identity.
      }
    }
    return undefined
  } catch {
    return undefined
  }
}
