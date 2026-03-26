import { defineConfig } from 'vitest/config'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: rootDir,
  test: {
    name: 'electron',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
})
