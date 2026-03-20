import { readRegistry } from '../registry/registry.js'
import { loadModFiles } from '../mods/loader.js'
import { findAideSections } from '../conflict/tags.js'
import { readFile, existsSync } from 'node:fs'
import { promisify } from 'node:util'
import { join } from 'node:path'
import type { InstalledMod } from '../registry/schema.js'

const readFileAsync = promisify(readFile)

export interface LocalModStatus {
  templateName: string
  hasAideTags: boolean
  managedSections: string[]
}

export interface ListResult {
  global_mods: InstalledMod[]
  local_status: LocalModStatus[]
  linked: boolean
}

export interface ListOptions {
  projectPath: string
  homeOverride?: string
}

const CONTEXT_FILES = ['CLAUDE.md', 'AGENTS.md', '.cursorrules']

/**
 * Lists global mods and checks which context files are active in the current project.
 */
export async function list(options: ListOptions): Promise<ListResult> {
  const { projectPath, homeOverride } = options
  const registry = await readRegistry(homeOverride)

  const global_mods = Object.values(registry.mods)
  const linked = projectPath in registry.linked_projects

  const local_status: LocalModStatus[] = []
  for (const name of CONTEXT_FILES) {
    const filePath = join(projectPath, name)
    if (!existsSync(filePath)) continue

    let content = ''
    try {
      content = (await readFileAsync(filePath, 'utf8')).toString()
    } catch {
      // skip unreadable files
    }
    const sections = findAideSections(content)
    local_status.push({
      templateName: name,
      hasAideTags: sections.length > 0,
      managedSections: sections.map(s => s.templateId),
    })
  }

  return { global_mods, local_status, linked }
}
