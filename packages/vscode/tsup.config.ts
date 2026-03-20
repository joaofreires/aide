import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  dts: false,
  clean: true,
  // vscode is injected by the extension host — never bundle it
  external: ['vscode'],
  // bundle @aide/core and chokidar into the single output file
  noExternal: [/@aide\/core/, 'chokidar'],
})
