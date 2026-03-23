import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, basename, extname, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { parseFrontmatter } from '../skills/frontmatter.js'
import { readRegistry } from '../registry/registry.js'
import { readConfig } from '../config/config.js'
import { getProjectArchivePaths } from '../fs/aideDir.js'
import { listTypedEntries } from './discover.js'

export { type SkillFrontmatter } from '../skills/frontmatter.js'
import type { SkillFrontmatter } from '../skills/frontmatter.js'

export type ProjectSkillStatus =
  | 'library-active'    // lib skill, copy present in project's skill dir (same checksum)
  | 'library-inactive'  // lib skill, not in any project skill dir
  | 'local-unique'      // in project, not in library
  | 'local-modified'    // in project, same name as lib skill but different checksum
  | 'archived'          // disabled local skill in ~/.aide/projects/{name}/skills/

export interface ProjectSkill {
  id: string
  name: string
  status: ProjectSkillStatus
  library_path: string | null
  library_checksum: string | null
  project_path: string | null
  project_checksum: string | null
  project_rel: string | null
  archive_path: string | null
  original_rel: string | null       // first original rel (display compat)
  all_project_paths: string[]       // every project-level path where this skill exists
  all_project_rels: string[]        // every project-level rel dir where this skill exists
  home_paths: string[]              // home-level paths (global, cannot be disabled per-project)
  original_rels: string[]           // from archive meta (all dirs it was in before disable)
  frontmatter: SkillFrontmatter | null
}

export interface ProjectSkillsResult {
  project_path: string
  project_name: string
  skills: ProjectSkill[]
  primary_skill_rel: string
  active_skill_rels: string[]   // all skill dirs that actually exist in the project
}

export interface ArchivedSkillMeta {
  id: string
  original_rels: string[]   // all rel dirs the skill was in (replaces original_rel)
  archived_at: string
  was_skill_md: boolean
}

function computeChecksum(content: Buffer | string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex')
}

function deriveId(filePath: string): string {
  return basename(filePath) === 'SKILL.md'
    ? basename(dirname(filePath))
    : basename(filePath, extname(filePath))
}

export async function listProjectSkills(
  projectPath: string,
  homeOverride?: string,
): Promise<ProjectSkillsResult> {
  const [config, registry] = await Promise.all([
    readConfig(homeOverride),
    readRegistry(homeOverride),
  ])
  const archPaths = getProjectArchivePaths(projectPath, homeOverride)
  const projectName = basename(projectPath)

  // ── Step 1: scan project's skill dirs + home-level dirs for AI tools in use ──
  const home = homeOverride ?? homedir()
  type SkillEntry = { path: string; rel: string; checksum: string; all_project_paths: string[]; all_project_rels: string[]; home_paths: string[]; frontmatter: SkillFrontmatter | null }
  const projectSkills = new Map<string, SkillEntry>()

  async function scanDir(dir: string, rel: string, isHome: boolean) {
    const files = await listTypedEntries(dir)
    for (const filePath of files) {
      const id = deriveId(filePath)
      const existing = projectSkills.get(id)
      if (existing) {
        if (isHome) {
          existing.home_paths.push(filePath)
        } else {
          existing.all_project_paths.push(filePath)
          if (!existing.all_project_rels.includes(rel)) existing.all_project_rels.push(rel)
        }
      } else {
        try {
          const content = await readFile(filePath)
          const text = content.toString('utf8')
          projectSkills.set(id, {
            path: filePath, rel, checksum: computeChecksum(content),
            all_project_paths: isHome ? [] : [filePath],
            all_project_rels: isHome ? [] : [rel],
            home_paths: isHome ? [filePath] : [],
            frontmatter: parseFrontmatter(text),
          })
        } catch { /* skip unreadable */ }
      }
    }
  }

  for (const entry of config.skill_dirs) {
    // Scan project-level skill dir (e.g. projectPath/.codex/skills/)
    await scanDir(join(projectPath, entry.rel), entry.rel, false)

    // If this AI tool is in use by the project (e.g. .codex/ exists),
    // also scan the home-level skill dir (e.g. ~/.codex/skills/)
    const toolDir = dirname(entry.rel)  // e.g. ".codex" from ".codex/skills"
    if (existsSync(join(projectPath, toolDir))) {
      const homeSkillDir = join(home, entry.rel)
      if (homeSkillDir !== join(projectPath, entry.rel)) {
        await scanDir(homeSkillDir, entry.rel, true)
      }
    }
  }

  // ── Step 2: scan archive dir ───────────────────────────────────────────────
  const archivedSkills = new Map<string, { archive_path: string; meta: ArchivedSkillMeta | null }>()
  if (existsSync(archPaths.skillsDir)) {
    const { readdir } = await import('node:fs/promises')
    const dirents = await readdir(archPaths.skillsDir, { withFileTypes: true })
    for (const dirent of dirents) {
      if (dirent.name.endsWith('.meta.json')) continue
      const id = dirent.isDirectory() ? dirent.name : basename(dirent.name, extname(dirent.name))
      const archivePath = join(archPaths.skillsDir, dirent.name)
      const metaPath = join(archPaths.skillsDir, id + '.meta.json')
      let meta: ArchivedSkillMeta | null = null
      if (existsSync(metaPath)) {
        try {
          const raw = JSON.parse(await readFile(metaPath, 'utf8'))
          // Backward compat: old archives have original_rel (string) instead of original_rels
          if (!raw.original_rels && raw.original_rel) {
            raw.original_rels = [raw.original_rel]
          }
          raw.original_rels ??= []
          meta = raw as ArchivedSkillMeta
        } catch { /* skip */ }
      }
      archivedSkills.set(id, { archive_path: archivePath, meta })
    }
  }

  // ── Step 3: build skill list ───────────────────────────────────────────────
  const skills: ProjectSkill[] = []
  const seen = new Set<string>()

  // Library skills
  const libSkills = Object.values(registry.mods).filter(m => m.type === 'skill')
  for (const lib of libSkills) {
    seen.add(lib.id)
    const proj = projectSkills.get(lib.id)
    if (proj) {
      const checksumMatch = lib.checksum !== null && proj.checksum === lib.checksum
      skills.push({
        id: lib.id,
        name: lib.id,
        status: checksumMatch ? 'library-active' : 'local-modified',
        library_path: lib.path,
        library_checksum: lib.checksum,
        project_path: proj.path,
        project_checksum: proj.checksum,
        project_rel: proj.rel,
        archive_path: null,
        original_rel: null,
        all_project_paths: proj.all_project_paths,
        all_project_rels: proj.all_project_rels,
        home_paths: proj.home_paths,
        original_rels: [],
        frontmatter: proj.frontmatter,
      })
    } else {
      // library-inactive: read frontmatter from library copy
      let libFrontmatter: SkillFrontmatter | null = null
      if (lib.path) {
        try {
          const text = await readFile(lib.path, 'utf8')
          libFrontmatter = parseFrontmatter(text)
        } catch { /* skip */ }
      }
      skills.push({
        id: lib.id,
        name: lib.id,
        status: 'library-inactive',
        library_path: lib.path,
        library_checksum: lib.checksum,
        project_path: null,
        project_checksum: null,
        project_rel: null,
        archive_path: null,
        original_rel: null,
        all_project_paths: [],
        all_project_rels: [],
        home_paths: [],
        original_rels: [],
        frontmatter: libFrontmatter,
      })
    }
  }

  // Local-unique skills (in project but not in library)
  for (const [id, proj] of projectSkills) {
    if (seen.has(id)) continue
    seen.add(id)
    skills.push({
      id,
      name: id,
      status: 'local-unique',
      library_path: null,
      library_checksum: null,
      project_path: proj.path,
      project_checksum: proj.checksum,
      project_rel: proj.rel,
      archive_path: null,
      original_rel: null,
      all_project_paths: proj.all_project_paths,
      all_project_rels: proj.all_project_rels,
      home_paths: proj.home_paths,
      original_rels: [],
      frontmatter: proj.frontmatter,
    })
  }

  // Archived skills
  for (const [id, arch] of archivedSkills) {
    if (seen.has(id)) continue
    const rels = arch.meta?.original_rels ?? []
    // Read frontmatter from archive (dir: SKILL.md inside; flat: the .md file itself)
    let archFrontmatter: SkillFrontmatter | null = null
    try {
      const { stat } = await import('node:fs/promises')
      const s = await stat(arch.archive_path)
      const skillMdPath = s.isDirectory() ? join(arch.archive_path, 'SKILL.md') : arch.archive_path
      const text = await readFile(skillMdPath, 'utf8')
      archFrontmatter = parseFrontmatter(text)
    } catch { /* skip */ }
    skills.push({
      id,
      name: id,
      status: 'archived',
      library_path: null,
      library_checksum: null,
      project_path: null,
      project_checksum: null,
      project_rel: null,
      archive_path: arch.archive_path,
      original_rel: rels[0] ?? null,
      all_project_paths: [],
      all_project_rels: [],
      home_paths: [],
      original_rels: rels,
      frontmatter: archFrontmatter,
    })
  }

  // ── Step 4: resolve primary skill dir and active skill rels ──────────────
  const existingEntries = config.skill_dirs.filter(e => existsSync(join(projectPath, e.rel)))
  const primaryEntry = existingEntries[0] ?? config.skill_dirs[0]
  const primary_skill_rel = primaryEntry?.rel ?? '.claude/skills'
  const active_skill_rels = existingEntries.map(e => e.rel)

  return { project_path: projectPath, project_name: projectName, skills, primary_skill_rel, active_skill_rels }
}
