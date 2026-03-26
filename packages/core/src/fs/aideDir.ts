import { homedir } from 'node:os'
import { join, basename } from 'node:path'
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

export interface ProjectArchivePaths {
  projectDir: string   // ~/.aide/projects/{name}
  skillsDir: string    // ~/.aide/projects/{name}/skills
}

export interface GlobalSkillArchivePaths {
  skillsDir: string    // ~/.aide/global-skills
}

export function getProjectArchivePaths(projectPath: string, homeOverride?: string): ProjectArchivePaths {
  const home = homeOverride ?? homedir()
  const projectName = basename(projectPath)
  const projectDir = join(home, '.aide', 'projects', projectName)
  return { projectDir, skillsDir: join(projectDir, 'skills') }
}

export async function ensureProjectArchiveDir(
  projectPath: string,
  homeOverride?: string,
): Promise<ProjectArchivePaths> {
  const paths = getProjectArchivePaths(projectPath, homeOverride)
  await mkdir(paths.skillsDir, { recursive: true })
  return paths
}

export function getGlobalSkillArchivePaths(homeOverride?: string): GlobalSkillArchivePaths {
  const paths = getAidePaths(homeOverride)
  return { skillsDir: join(paths.root, 'global-skills') }
}

export async function ensureGlobalSkillArchiveDir(
  homeOverride?: string,
): Promise<GlobalSkillArchivePaths> {
  const paths = getGlobalSkillArchivePaths(homeOverride)
  await mkdir(paths.skillsDir, { recursive: true })
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
