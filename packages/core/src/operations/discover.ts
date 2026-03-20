import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { homedir } from 'node:os'
import { getAidePaths } from '../fs/aideDir.js'
import { readRegistry } from '../registry/registry.js'
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

/** Filenames that are always templates regardless of location */
const TEMPLATE_NAMES = new Set(['CLAUDE.md', 'AGENTS.md', '.cursorrules', 'copilot-instructions.md'])

/**
 * Known typed directories: every file inside is that type.
 * rel is relative to home (~/).
 */
const TYPED_DIRS: Array<{ rel: string; type: ModType }> = [
  // Skills
  { rel: '.codex/skills',    type: 'skill' },
  { rel: '.claude/skills',   type: 'skill' },
  { rel: '.opencode/skills', type: 'skill' },
  { rel: '.cursor/tools',    type: 'skill' },
  { rel: '.aider/scripts',   type: 'skill' },
  { rel: '.continue/tools',  type: 'skill' },

  // Agents / personas
  { rel: '.codex/agents',    type: 'agent' },
  { rel: '.claude/agents',   type: 'agent' },
  { rel: '.opencode/agents', type: 'agent' },
  { rel: '.cursor/rules',    type: 'agent' },
  { rel: '.aider/prompts',   type: 'agent' },
  { rel: '.continue/prompts',type: 'agent' },
]

/**
 * Roots to scan for template files by name (CLAUDE.md, AGENTS.md, etc.).
 * Hidden AI tool dirs are included so we catch e.g. ~/.github/copilot-instructions.md.
 */
const TEMPLATE_SCAN_ROOTS: Array<{ rel: string; depth: number }> = [
  { rel: '.',        depth: 0 },
  { rel: '.github',  depth: 1 },
  { rel: '.claude',  depth: 1 },
  { rel: '.cursor',  depth: 1 },
  { rel: '.codex',   depth: 1 },
  { rel: '.opencode',depth: 1 },
  { rel: 'Projects', depth: 3 },
  { rel: 'projects', depth: 3 },
  { rel: 'dev',      depth: 3 },
  { rel: 'code',     depth: 3 },
  { rel: 'workspace',depth: 3 },
  { rel: 'Documents',depth: 2 },
  { rel: 'src',      depth: 3 },
]

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.cache',
  '__pycache__', 'vendor', '.npm', '.yarn', '.pnpm',
  'target', 'out', '.svelte-kit', 'coverage', 'tmp',
])

/**
 * List skill/agent entries from a typed directory.
 * - Subdirectories containing SKILL.md → returns SKILL.md path (Agent Skills standard)
 * - Direct files → returned as-is (legacy script/command format)
 */
async function listTypedEntries(dir: string): Promise<string[]> {
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

/** Scan for files matching TEMPLATE_NAMES, skipping noise dirs. */
async function scanForTemplates(
  dir: string,
  currentDepth: number,
  maxDepth: number,
  out: string[],
): Promise<void> {
  if (currentDepth > maxDepth || !existsSync(dir)) return
  let entries: string[]
  try { entries = await readdir(dir) } catch { return }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    try {
      const s = await stat(full)
      if (s.isFile() && TEMPLATE_NAMES.has(entry)) {
        out.push(full)
      } else if (s.isDirectory() && currentDepth < maxDepth) {
        await scanForTemplates(full, currentDepth + 1, maxDepth, out)
      }
    } catch { /* skip */ }
  }
}

export async function discover(homeOverride?: string): Promise<DiscoverResult> {
  const home = homeOverride ?? homedir()
  const paths = getAidePaths(homeOverride)
  const registry = await readRegistry(homeOverride)
  const importedPaths = new Set(Object.values(registry.mods).map(m => m.path))

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
  for (const { rel, type } of TYPED_DIRS) {
    const dir = join(home, rel)
    if (dir === paths.root || dir.startsWith(paths.root + '/')) continue
    if (!existsSync(dir)) continue
    scannedDirs.push(dir)
    const files = await listTypedEntries(dir)
    for (const f of files) addFile(f, type)
  }

  // 2. Template name scan across common project roots
  const templateFiles: string[] = []
  for (const { rel, depth } of TEMPLATE_SCAN_ROOTS) {
    const dir = rel === '.' ? home : join(home, rel)
    if (dir === paths.root || dir.startsWith(paths.root + '/')) continue
    if (!existsSync(dir)) continue
    if (!scannedDirs.includes(dir)) scannedDirs.push(dir)
    await scanForTemplates(dir, 0, depth, templateFiles)
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
