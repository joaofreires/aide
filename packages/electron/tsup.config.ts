import { defineConfig } from 'tsup'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Plugin } from 'esbuild'

/** esbuild plugin that resolves .js imports to .tsx/.ts files (for TypeScript NodeNext compat) */
const resolveTsExtensions: Plugin = {
  name: 'resolve-ts-from-js',
  setup(build) {
    build.onResolve({ filter: /\.js$/ }, args => {
      if (!args.importer) return undefined
      const base = join(dirname(args.importer), args.path.slice(0, -3))
      for (const ext of ['.tsx', '.ts']) {
        if (existsSync(base + ext)) return { path: base + ext }
      }
      return undefined
    })
  },
}

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
  {
    entry: { renderer: 'src/renderer/index.tsx' },
    format: ['iife'],
    dts: false,
    noExternal: ['react', 'react-dom'],
    outDir: 'dist/renderer',
    onSuccess: 'cp src/renderer/index.html src/renderer/styles.css dist/renderer/',
    esbuildOptions(options) {
      options.jsx = 'automatic'
      options.define = { 'process.env.NODE_ENV': '"development"' }
    },
    esbuildPlugins: [resolveTsExtensions],
  },
])
