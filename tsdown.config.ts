import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

const toolchainAssetDirectory = resolve('assets/toolchains')

/** DSH lazy-CJS Browser artifact: the shell supplies React through its module table. */
export default defineConfig({
  entry: { client: 'src/client.ts' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: false,
  // Host tsc shares lib/; clean the shared output once before both build stages.
  clean: false,
  alias: {
    'toolchain-assets': toolchainAssetDirectory,
  },
  loader: {
    '.svg': 'dataurl',
    '.png': 'dataurl',
    '.ico': 'dataurl',
    '.webp': 'dataurl',
  },
  deps: {
    neverBundle: ['react', 'react/jsx-runtime'],
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "dsh-runtime-inspector", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
