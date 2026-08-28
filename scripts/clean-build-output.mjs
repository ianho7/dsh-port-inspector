import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const buildOutputDirectory = resolve(repositoryRoot, 'lib')

// Host and Browser artifacts share lib/. Remove only this generated directory
// before the two compilers run so stale chunks and source maps cannot ship.
await rm(buildOutputDirectory, { recursive: true, force: true })
