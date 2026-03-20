import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/main.ts'],
    format: ['cjs'],
    dts: false,
    clean: true,
    external: ['electron'],
    noExternal: [/@aide\/core/],
    outDir: 'dist',
  },
  {
    entry: ['src/preload.ts'],
    format: ['cjs'],
    dts: false,
    external: ['electron'],
    outDir: 'dist',
  },
])
