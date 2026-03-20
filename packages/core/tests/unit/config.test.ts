import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readConfig, writeConfig, updateConfig } from '../../src/config/config.js'
import { DEFAULT_CONFIG } from '../../src/config/schema.js'
import { CorruptConfigError } from '../../src/errors/AideError.js'
import { writeFile, mkdir } from 'node:fs/promises'

let tmpHome: string

beforeEach(async () => {
  tmpHome = await mkdtemp(join(tmpdir(), 'aide-test-'))
})

afterEach(async () => {
  await rm(tmpHome, { recursive: true, force: true })
})

describe('readConfig', () => {
  it('returns default config when file does not exist', async () => {
    const config = await readConfig(tmpHome)
    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it('reads and parses a valid config file', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })
    const configData = { ...DEFAULT_CONFIG, auto_propagate: false }
    await writeFile(join(aideDir, 'config.json'), JSON.stringify(configData), 'utf8')

    const config = await readConfig(tmpHome)
    expect(config.auto_propagate).toBe(false)
  })

  it('throws CorruptConfigError for invalid JSON', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })
    await writeFile(join(aideDir, 'config.json'), 'not json', 'utf8')

    await expect(readConfig(tmpHome)).rejects.toThrow(CorruptConfigError)
  })

  it('throws CorruptConfigError for schema mismatch', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })
    await writeFile(join(aideDir, 'config.json'), JSON.stringify({ version: '99' }), 'utf8')

    await expect(readConfig(tmpHome)).rejects.toThrow(CorruptConfigError)
  })
})

describe('writeConfig', () => {
  it('writes and reads back a config', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })

    await writeConfig({ ...DEFAULT_CONFIG, auto_propagate: false }, tmpHome)
    const config = await readConfig(tmpHome)
    expect(config.auto_propagate).toBe(false)
  })
})

describe('updateConfig', () => {
  it('merges partial updates into existing config', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })
    await writeConfig(DEFAULT_CONFIG, tmpHome)

    const updated = await updateConfig({ confirm_before_write: false }, tmpHome)
    expect(updated.confirm_before_write).toBe(false)
    expect(updated.auto_propagate).toBe(DEFAULT_CONFIG.auto_propagate)
  })
})
