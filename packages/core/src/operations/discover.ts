import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { homedir } from 'node:os'
import { getAidePaths } from '../fs/aideDir.js'
import { readRegistry } from '../registry/registry.js'
import { readConfig } from '../config/config.js'
import type { GlobalConfig } from '../config/schema.js'
import type { ModType } from '../registry/schema.js'

export type DiscoveredFile = {
  path: string
  name: string
  type: ModType
  already_imported: boolean
}

export type DiscoverResult = {
  found: DiscoveredFile[]
  scanned_dirs: string[]
}

/**
 * List skill/agent entries from a typed directory.
 * - Subdirectories containing SKILL.md → returns SKILL.md path (Agent Skills standard)
 * - Direct files → returned as-is (legacy script/command format)
 */
export async function listTypedEntries(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  try {
    const entries = await readdir(dir)
    const files: string[] = []
    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const full = join(dir, entry)
      try {
        const s = await stat(full)
        if (s.isDirectory()) {
          // Agent Skills standard: skill is a directory with SKILL.md
          const skillMd = join(full, 'SKILL.md')
          if (existsSync(skillMd)) files.push(skillMd)
        } else if (s.isFile()) {
          files.push(full)
        }
      } catch { /* skip */ }
    }
    return files
  } catch {
    return []
  }
}

/** Scan for files matching templateNames, skipping noise dirs. */
async function scanForTemplates(
  dir: string,
  currentDepth: number,
  maxDepth: number,
  out: string[],
  templateNames: Set<string>,
  skipDirs: Set<string>,
): Promise<void> {
  if (currentDepth > maxDepth || !existsSync(dir)) return
  let entries: string[]
  try { entries = await readdir(dir) } catch { return }

  for (const entry of entries) {
    if (skipDirs.has(entry)) continue
    const full = join(dir, entry)
    try {
      const s = await stat(full)
      if (s.isFile() && templateNames.has(entry)) {
        out.push(full)
      } else if (s.isDirectory() && currentDepth < maxDepth) {
        await scanForTemplates(full, currentDepth + 1, maxDepth, out, templateNames, skipDirs)
      }
    } catch { /* skip */ }
  }
}

export async function discover(homeOverride?: string, configOverride?: GlobalConfig): Promise<DiscoverResult> {
  const home = homeOverride ?? homedir()
  const paths = getAidePaths(homeOverride)
  const registry = await readRegistry(homeOverride)
  const config = configOverride ?? await readConfig(homeOverride)
  const importedPaths = new Set(Object.values(registry.mods).map(m => m.path))

  const typedDirs = [...config.skill_dirs, ...config.agent_dirs]
  const templateNames = new Set(config.template_names)
  const skipDirs = new Set(config.skip_dirs)

  const seen = new Set<string>()
  const found: DiscoveredFile[] = []
  const scannedDirs: string[] = []

  function addFile(filePath: string, type: ModType) {
    if (seen.has(filePath)) return
    seen.add(filePath)
    // For SKILL.md files (Agent Skills standard), use the parent directory name
    const name = basename(filePath) === 'SKILL.md'
      ? basename(dirname(filePath))
      : basename(filePath)
    found.push({
      path: filePath,
      name,
      type,
      already_imported: importedPaths.has(filePath),
    })
  }

  // 1. Typed directories — every file inside is that type
  for (const { rel, type } of typedDirs) {
    const dir = join(home, rel)
    if (dir === paths.root || dir.startsWith(paths.root + '/')) continue
    if (!existsSync(dir)) continue
    scannedDirs.push(dir)
    const files = await listTypedEntries(dir)
    for (const f of files) addFile(f, type as ModType)
  }

  // 2. Template name scan across configured project roots
  const templateFiles: string[] = []
  for (const { rel, depth } of config.template_scan_roots) {
    const dir = rel === '.' ? home : join(home, rel)
    if (dir === paths.root || dir.startsWith(paths.root + '/')) continue
    if (!existsSync(dir)) continue
    if (!scannedDirs.includes(dir)) scannedDirs.push(dir)
    await scanForTemplates(dir, 0, depth, templateFiles, templateNames, skipDirs)
  }
  for (const f of templateFiles) addFile(f, 'template')

  // Sort: new items first, then templates → agents → skills
  const typeOrder: Record<ModType, number> = { template: 0, agent: 1, skill: 2 }
  found.sort((a, b) => {
    if (a.already_imported !== b.already_imported) return a.already_imported ? 1 : -1
    return typeOrder[a.type] - typeOrder[b.type]
  })

  return { found, scanned_dirs: scannedDirs }
}
