import { access, copyFile, readFile, readdir, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { updateToolchainLogos } from './update-toolchain-logos.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = resolve(repositoryRoot, 'assets/toolchains/sources.json')
const assetDirectory = resolve(repositoryRoot, 'assets/toolchains')
const candidateDirectory = resolve(assetDirectory, 's2-candidates/normalized')
const supportedExtensions = ['.svg', '.png', '.ico', '.jpg', '.jpeg']

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const ids = Object.keys(manifest).sort()
const existingFiles = new Set(await readdir(assetDirectory))

for (const id of ids) {
  const sourcePath = join(candidateDirectory, `${id}.png`)
  await access(sourcePath)

  for (const extension of supportedExtensions) {
    const file = `${id}${extension}`
    const targetPath = join(assetDirectory, file)
    if (extension !== '.png' && existingFiles.has(file)) {
      await unlink(targetPath)
    }
  }

  await copyFile(sourcePath, join(assetDirectory, `${id}.png`))
}

await updateToolchainLogos()
console.log(`Synchronized ${ids.length} toolchain logo candidates and regenerated ${resolve(repositoryRoot, 'src/client/toolchain-logo-data.ts')}.`)
