import { describe, expect, it } from 'vitest'
import type { Options } from 'tsup'
import tsupConfig from '../../tsup.config.js'

async function resolveConfig(overrideOptions: Options = {}) {
  if (typeof tsupConfig === 'function') {
    return await tsupConfig(overrideOptions)
  }

  return tsupConfig
}

describe('electron tsup config', () => {
  it('does not clean dist while running in watch mode', async () => {
    const configs = await resolveConfig({ watch: true })

    for (const config of configs) {
      if (typeof config.outDir === 'string' && config.outDir.startsWith('dist')) {
        expect(config.clean).not.toBe(true)
      }
    }
  })

  it('cleans the main output during a regular build', async () => {
    const configs = await resolveConfig()
    const mainConfig = configs.find(config => Array.isArray(config.entry) && config.entry.includes('src/main.ts'))

    expect(mainConfig?.clean).toBe(true)
  })
})
