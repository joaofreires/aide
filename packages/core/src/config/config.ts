import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { CorruptConfigError } from '../errors/AideError.js'
import { GlobalConfigSchema, DEFAULT_CONFIG, type GlobalConfig } from './schema.js'
import { getAidePaths } from '../fs/aideDir.js'

export async function readConfig(homeOverride?: string): Promise<GlobalConfig> {
  const paths = getAidePaths(homeOverride)

  if (!existsSync(paths.config)) {
    return DEFAULT_CONFIG
  }

  let raw: string
  try {
    raw = await readFile(paths.config, 'utf8')
  } catch (err) {
    throw new CorruptConfigError(`Could not read config file: ${String(err)}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new CorruptConfigError('Config file is not valid JSON.')
  }

  const result = GlobalConfigSchema.safeParse(parsed)
  if (!result.success) {
    throw new CorruptConfigError(result.error.message)
  }

  return result.data
}

export async function writeConfig(config: GlobalConfig, homeOverride?: string): Promise<void> {
  const paths = getAidePaths(homeOverride)
  const validated = GlobalConfigSchema.parse(config)
  await writeFile(paths.config, JSON.stringify(validated, null, 2) + '\n', 'utf8')
}

export async function updateConfig(
  updates: Partial<Omit<GlobalConfig, 'version'>>,
  homeOverride?: string,
): Promise<GlobalConfig> {
  const current = await readConfig(homeOverride)
  const updated: GlobalConfig = { ...current, ...updates }
  await writeConfig(updated, homeOverride)
  return updated
}
