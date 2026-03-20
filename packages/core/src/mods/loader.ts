import { readdir, readFile } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { existsSync } from 'node:fs'
import { getAidePaths } from '../fs/aideDir.js'
import type { InstalledMod } from '../registry/schema.js'

/**
 * Lists all mod files in a given directory.
 */
async function listFilesInDir(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    return entries.filter(e => e.isFile()).map(e => join(dir, e.name))
  } catch {
    return []
  }
}

/**
 * Loads all installed mod files from ~/.aide/{agents,skills,templates}
 * and returns them as partial InstalledMod objects (without registry metadata).
 */
export async function loadModFiles(homeOverride?: string): Promise<
  Array<{ path: string; type: InstalledMod['type']; name: string }>
> {
  const paths = getAidePaths(homeOverride)
  const results: Array<{ path: string; type: InstalledMod['type']; name: string }> = []

  const agentFiles = await listFilesInDir(paths.agents)
  for (const f of agentFiles) {
    results.push({ path: f, type: 'agent', name: basename(f, extname(f)) })
  }

  const skillFiles = await listFilesInDir(paths.skills)
  for (const f of skillFiles) {
    results.push({ path: f, type: 'skill', name: basename(f, extname(f)) })
  }

  const templateFiles = await listFilesInDir(paths.templates)
  for (const f of templateFiles) {
    results.push({ path: f, type: 'template', name: basename(f) })
  }

  return results
}

/**
 * Reads a mod file's content.
 */
export async function readModContent(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8')
}
