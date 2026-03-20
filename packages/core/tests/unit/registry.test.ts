import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readRegistry,
  writeRegistry,
  addMod,
  removeMod,
  linkProject,
  unlinkProject,
  getLinkedProject,
} from '../../src/registry/registry.js'
import { DEFAULT_REGISTRY, type InstalledMod } from '../../src/registry/schema.js'
import { CorruptRegistryError, ModNotFoundError, ModAlreadyExistsError } from '../../src/errors/AideError.js'
import { writeFile } from 'node:fs/promises'

let tmpHome: string

const sampleMod: InstalledMod = {
  id: 'test-agent',
  type: 'agent',
  source: 'local',
  source_url: null,
  installed_at: '2026-03-20T12:00:00.000Z',
  version: '1.0.0',
  path: '/home/test/.aide/agents/test-agent.md',
  checksum: null,
}

beforeEach(async () => {
  tmpHome = await mkdtemp(join(tmpdir(), 'aide-test-'))
})

afterEach(async () => {
  await rm(tmpHome, { recursive: true, force: true })
})

describe('readRegistry', () => {
  it('returns default registry when file does not exist', async () => {
    const registry = await readRegistry(tmpHome)
    expect(registry).toEqual(DEFAULT_REGISTRY)
  })

  it('reads and parses a valid registry file', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })
    const data = { ...DEFAULT_REGISTRY, mods: { 'test-agent': sampleMod } }
    await writeFile(join(aideDir, 'registry.json'), JSON.stringify(data), 'utf8')

    const registry = await readRegistry(tmpHome)
    expect(registry.mods['test-agent']).toBeDefined()
  })

  it('throws CorruptRegistryError for invalid JSON', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })
    await writeFile(join(aideDir, 'registry.json'), 'bad json', 'utf8')

    await expect(readRegistry(tmpHome)).rejects.toThrow(CorruptRegistryError)
  })
})

describe('addMod', () => {
  it('adds a mod to the registry', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })

    const registry = await addMod(sampleMod, tmpHome)
    expect(registry.mods['test-agent']).toEqual(sampleMod)
  })

  it('throws ModAlreadyExistsError when adding duplicate', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })

    await addMod(sampleMod, tmpHome)
    await expect(addMod(sampleMod, tmpHome)).rejects.toThrow(ModAlreadyExistsError)
  })
})

describe('removeMod', () => {
  it('removes a mod from the registry', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })

    await addMod(sampleMod, tmpHome)
    const registry = await removeMod('test-agent', tmpHome)
    expect(registry.mods['test-agent']).toBeUndefined()
  })

  it('throws ModNotFoundError when mod does not exist', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })

    await expect(removeMod('nonexistent', tmpHome)).rejects.toThrow(ModNotFoundError)
  })
})

describe('linkProject / unlinkProject', () => {
  it('links and unlinks a project', async () => {
    const aideDir = join(tmpHome, '.aide')
    await mkdir(aideDir, { recursive: true })
    const projectPath = '/home/user/myproject'

    await linkProject(
      projectPath,
      {
        linked_at: '2026-03-20T12:00:00.000Z',
        applied_templates: ['CLAUDE.md'],
        variables: { project_name: 'myproject' },
      },
      tmpHome,
    )

    const linked = await getLinkedProject(projectPath, tmpHome)
    expect(linked?.project_path).toBe(projectPath)
    expect(linked?.variables['project_name']).toBe('myproject')

    await unlinkProject(projectPath, tmpHome)
    const unlinked = await getLinkedProject(projectPath, tmpHome)
    expect(unlinked).toBeUndefined()
  })
})
