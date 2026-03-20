import { unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { getMod, removeMod as removeModFromRegistry } from '../registry/registry.js'

export interface RemoveOptions {
  id: string
  homeOverride?: string
}

export interface RemoveResult {
  id: string
  path: string
}

/**
 * Removes a mod from both the filesystem and registry.
 */
export async function remove(options: RemoveOptions): Promise<RemoveResult> {
  const { id, homeOverride } = options
  const mod = await getMod(id, homeOverride)

  if (existsSync(mod.path)) {
    await unlink(mod.path)
  }

  await removeModFromRegistry(id, homeOverride)

  return { id, path: mod.path }
}
