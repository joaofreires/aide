import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { CorruptRegistryError, ModNotFoundError, ModAlreadyExistsError } from '../errors/AideError.js'
import {
  RegistrySchema,
  DEFAULT_REGISTRY,
  type Registry,
  type InstalledMod,
  type LinkedProject,
} from './schema.js'
import { getAidePaths } from '../fs/aideDir.js'

export async function readRegistry(homeOverride?: string): Promise<Registry> {
  const paths = getAidePaths(homeOverride)

  if (!existsSync(paths.registry)) {
    return DEFAULT_REGISTRY
  }

  let raw: string
  try {
    raw = await readFile(paths.registry, 'utf8')
  } catch (err) {
    throw new CorruptRegistryError(`Could not read registry file: ${String(err)}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new CorruptRegistryError('Registry file is not valid JSON.')
  }

  const result = RegistrySchema.safeParse(parsed)
  if (!result.success) {
    throw new CorruptRegistryError(result.error.message)
  }

  return result.data
}

export async function writeRegistry(registry: Registry, homeOverride?: string): Promise<void> {
  const paths = getAidePaths(homeOverride)
  const validated = RegistrySchema.parse(registry)
  await writeFile(paths.registry, JSON.stringify(validated, null, 2) + '\n', 'utf8')
}

export async function getMod(id: string, homeOverride?: string): Promise<InstalledMod> {
  const registry = await readRegistry(homeOverride)
  const mod = registry.mods[id]
  if (!mod) throw new ModNotFoundError(id)
  return mod
}

export async function addMod(mod: InstalledMod, homeOverride?: string): Promise<Registry> {
  const registry = await readRegistry(homeOverride)
  if (registry.mods[mod.id]) throw new ModAlreadyExistsError(mod.id)
  const updated: Registry = {
    ...registry,
    mods: { ...registry.mods, [mod.id]: mod },
  }
  await writeRegistry(updated, homeOverride)
  return updated
}

export async function removeMod(id: string, homeOverride?: string): Promise<Registry> {
  const registry = await readRegistry(homeOverride)
  if (!registry.mods[id]) throw new ModNotFoundError(id)
  const { [id]: _removed, ...remainingMods } = registry.mods
  const updated: Registry = { ...registry, mods: remainingMods }
  await writeRegistry(updated, homeOverride)
  return updated
}

export async function linkProject(
  projectPath: string,
  link: Omit<LinkedProject, 'project_path'>,
  homeOverride?: string,
): Promise<Registry> {
  const registry = await readRegistry(homeOverride)
  const updated: Registry = {
    ...registry,
    linked_projects: {
      ...registry.linked_projects,
      [projectPath]: { project_path: projectPath, ...link },
    },
  }
  await writeRegistry(updated, homeOverride)
  return updated
}

export async function unlinkProject(projectPath: string, homeOverride?: string): Promise<Registry> {
  const registry = await readRegistry(homeOverride)
  const { [projectPath]: _removed, ...remaining } = registry.linked_projects
  const updated: Registry = { ...registry, linked_projects: remaining }
  await writeRegistry(updated, homeOverride)
  return updated
}

export async function getLinkedProject(
  projectPath: string,
  homeOverride?: string,
): Promise<LinkedProject | undefined> {
  const registry = await readRegistry(homeOverride)
  return registry.linked_projects[projectPath]
}
