import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const candidateDirectory = resolve(repositoryRoot, 'assets/toolchains/s2-candidates')

const domains = Object.freeze({
  vite: 'vite.dev',
  nextjs: 'nextjs.org',
  nodejs: 'nodejs.org',
  bun: 'bun.sh',
  deno: 'deno.com',
  python: 'python.org',
  django: 'djangoproject.com',
  flask: 'flask.palletsprojects.com',
  fastapi: 'fastapi.tiangolo.com',
  spring: 'spring.io',
  go: 'go.dev',
  php: 'php.net',
  ruby: 'ruby-lang.org',
  postgresql: 'postgresql.org',
  mysql: 'mysql.com',
  mariadb: 'mariadb.org',
  mongodb: 'mongodb.com',
  docker: 'docker.com',
  firebase: 'firebase.google.com',
  ollama: 'ollama.com',
  redis: 'redis.io',
  metro: 'reactnative.dev',
  adb: 'developer.android.com',
  openai: 'openai.com',
  anthropic: 'anthropic.com',
  gemini: 'gemini.google.com',
  'github-copilot': 'github.com',
  cursor: 'cursor.com',
  'claude-code': 'anthropic.com',
  codex: 'openai.com',
  vscode: 'code.visualstudio.com',
  jetbrains: 'jetbrains.com',
})

function dimensions(bytes, mime) {
  if (mime === 'image/png' && bytes.length >= 24) {
    return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`
  }
  if (mime === 'image/jpeg') {
    for (let offset = 2; offset + 9 < bytes.length;) {
      if (bytes[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = bytes[offset + 1]
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2
        continue
      }
      const segmentLength = bytes.readUInt16BE(offset + 2)
      if ((marker >= 0xc0 && marker <= 0xc3)
        || (marker >= 0xc5 && marker <= 0xc7)
        || (marker >= 0xc9 && marker <= 0xcb)
        || (marker >= 0xcd && marker <= 0xcf)) {
        return `${bytes.readUInt16BE(offset + 5)}x${bytes.readUInt16BE(offset + 7)}`
      }
      offset += 2 + segmentLength
    }
  }
  return undefined
}

function extension(mime) {
  if (mime === 'image/png') return '.png'
  if (mime === 'image/jpeg') return '.jpg'
  return '.bin'
}

async function download(id, domain) {
  const url = new URL('https://www.google.com/s2/favicons')
  url.searchParams.set('domain', domain)
  url.searchParams.set('sz', '128')
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`)
  const mime = (response.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase()
  const bytes = Buffer.from(await response.arrayBuffer())
  const size = dimensions(bytes, mime)
  const problems = []
  if (mime !== 'image/png') problems.push(`format=${mime || 'unknown'}`)
  if (size !== '128x128') problems.push(`size=${size ?? 'unknown'}`)
  if (bytes.length < 256) problems.push(`tiny=${bytes.length}B`)
  const file = `${id}${extension(mime)}`
  await writeFile(join(candidateDirectory, file), bytes)
  return { id, domain, file, mime, bytes: bytes.length, size, problems }
}

await mkdir(candidateDirectory, { recursive: true })
for (const [id, domain] of Object.entries(domains)) {
  try {
    const result = await download(id, domain)
    console.log(`${result.id}\t${result.domain}\t${result.file}\t${result.mime}\t${result.size ?? '?'}\t${result.bytes}B\t${result.problems.join(', ') || 'ok'}`)
  } catch (error) {
    console.log(`${id}\t${domain}\tERROR\t${error instanceof Error ? error.message : String(error)}`)
  }
}
