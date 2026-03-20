import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdir, access, constants } from 'node:fs/promises'

export interface AidePaths {
  root: string
  agents: string
  skills: string
  templates: string
  registry: string
  config: string
}

/**
 * Resolves the ~/.aide directory structure.
 * Accepts an optional homeOverride for testing without touching the real home directory.
 */
export function getAidePaths(homeOverride?: string): AidePaths {
  const home = homeOverride ?? homedir()
  const root = join(home, '.aide')
  return {
    root,
    agents: join(root, 'agents'),
    skills: join(root, 'skills'),
    templates: join(root, 'templates'),
    registry: join(root, 'registry.json'),
    config: join(root, 'config.json'),
  }
}

/**
 * Ensures all required ~/.aide subdirectories exist.
 * Creates them if missing. Safe to call multiple times.
 */
export async function ensureAideDir(homeOverride?: string): Promise<AidePaths> {
  const paths = getAidePaths(homeOverride)
  await mkdir(paths.root, { recursive: true })
  await mkdir(paths.agents, { recursive: true })
  await mkdir(paths.skills, { recursive: true })
  await mkdir(paths.templates, { recursive: true })
  return paths
}

/**
 * Checks if the ~/.aide directory has been initialized.
 */
export async function isAideDirInitialized(homeOverride?: string): Promise<boolean> {
  const paths = getAidePaths(homeOverride)
  try {
    await access(paths.root, constants.F_OK)
    return true
  } catch {
    return false
  }
}
