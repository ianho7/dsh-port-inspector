import * as React from 'react'
import type { ToolchainId } from '../development-presentation.js'
import { TOOLCHAIN_LOGO_DATA } from './toolchain-logo-data.js'

export type ToolchainLogoSize = 'compact' | 'detail'

const labels: Readonly<Record<ToolchainId, string>> = Object.freeze({
  vite: 'Vite',
  nextjs: 'Next.js',
  nodejs: 'Node.js',
  bun: 'Bun',
  deno: 'Deno',
  python: 'Python',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI / Uvicorn',
  java: 'Java',
  spring: 'Spring',
  dotnet: '.NET',
  kestrel: 'Kestrel',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  redis: 'Redis',
  mongodb: 'MongoDB',
  docker: 'Docker',
  wsl: 'WSL',
  metro: 'Metro / React Native',
  adb: 'Android ADB',
  firebase: 'Firebase Emulator',
  ollama: 'Ollama',
})

const localLogos: Partial<Record<ToolchainId, { readonly name: string; readonly dataUri: string }>> = TOOLCHAIN_LOGO_DATA

export function toolchainName(toolchain: ToolchainId | undefined): string | undefined {
  return toolchain === undefined ? undefined : labels[toolchain]
}

export function ToolchainLogo({
  toolchain,
  size,
}: {
  readonly toolchain: ToolchainId | undefined
  readonly size: ToolchainLogoSize
}): React.ReactNode {
  const logo = toolchain === undefined ? undefined : localLogos[toolchain]
  if (logo === undefined) {
    return React.createElement('span', {
      className: `dsh-ri-toolchain-logo is-${size} is-fallback`,
      'aria-hidden': true,
    }, '⌘')
  }
  return React.createElement('img', {
    className: `dsh-ri-toolchain-logo is-${size}`,
    src: logo.dataUri,
    alt: '',
    'aria-hidden': true,
    draggable: false,
  })
}
