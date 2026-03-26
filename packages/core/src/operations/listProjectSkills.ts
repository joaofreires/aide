import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { readConfig } from '../config/config.js'
import {
  getGlobalSkillArchivePaths,
  getProjectArchivePaths,
} from '../fs/aideDir.js'
import { readRegistry } from '../registry/registry.js'
import { parseFrontmatter } from '../skills/frontmatter.js'
import { listTypedEntries } from './discover.js'

export { type SkillFrontmatter } from '../skills/frontmatter.js'
import type { SkillFrontmatter } from '../skills/frontmatter.js'

export type ProjectSkillStatus =
  | 'library-active'    // active copy exists in project or global provider dir and matches the library
  | 'library-inactive'  // library skill has no active project/global copy
  | 'local-unique'      // active copy exists but no library skill exists
  | 'local-modified'    // active copy exists but differs from the library
  | 'archived'          // no active copy exists, but an archived copy can be restored

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
  original_rel: string | null
  all_project_paths: string[]
  all_project_rels: string[]
  home_paths: string[]              // legacy alias for global_paths
  global_paths: string[]
  global_rels: string[]
  is_global: boolean
  global_archive_path: string | null
  global_original_rels: string[]
  preferred_enable_scope: 'project' | 'global'
  original_rels: string[]
  frontmatter: SkillFrontmatter | null
}

export interface ProjectSkillsResult {
  project_path: string
  project_name: string
  skills: ProjectSkill[]
  primary_skill_rel: string
  active_skill_rels: string[]
}

export interface ArchivedSkillMeta {
  id: string
  original_rels: string[]
  archived_at: string
  was_skill_md: boolean
}

interface ActiveSkillEntry {
  path: string
  rel: string
  checksum: string
  paths: string[]
  rels: string[]
  frontmatter: SkillFrontmatter | null
}

interface ArchivedSkillEntry {
  archive_path: string
  meta: ArchivedSkillMeta | null
  frontmatter: SkillFrontmatter | null
}

function computeChecksum(content: Buffer | string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex')
}

function deriveId(filePath: string): string {
  return basename(filePath) === 'SKILL.md'
    ? basename(dirname(filePath))
    : basename(filePath, extname(filePath))
}

async function readFrontmatterFromFile(filePath: string): Promise<SkillFrontmatter | null> {
  try {
    const text = await readFile(filePath, 'utf8')
    return parseFrontmatter(text)
  } catch {
    return null
  }
}

async function scanActiveSkills(
  dir: string,
  rel: string,
  target: Map<string, ActiveSkillEntry>,
): Promise<void> {
  const files = await listTypedEntries(dir)
  for (const filePath of files) {
    try {
      const content = await readFile(filePath)
      const id = deriveId(filePath)
      const existing = target.get(id)
      if (existing) {
        existing.paths.push(filePath)
        if (!existing.rels.includes(rel)) existing.rels.push(rel)
        continue
      }

      target.set(id, {
        path: filePath,
        rel,
        checksum: computeChecksum(content),
        paths: [filePath],
        rels: [rel],
        frontmatter: parseFrontmatter(content.toString('utf8')),
      })
    } catch {
      // Skip unreadable entries.
    }
  }
}

async function readArchiveMeta(metaPath: string): Promise<ArchivedSkillMeta | null> {
  if (!existsSync(metaPath)) return null

  try {
    const raw = JSON.parse(await readFile(metaPath, 'utf8'))
    if (!raw.original_rels && raw.original_rel) {
      raw.original_rels = [raw.original_rel]
    }
    raw.original_rels ??= []
    return raw as ArchivedSkillMeta
  } catch {
    return null
  }
}

async function readArchiveFrontmatter(archivePath: string): Promise<SkillFrontmatter | null> {
  try {
    const archiveStat = await stat(archivePath)
    const skillMdPath = archiveStat.isDirectory() ? join(archivePath, 'SKILL.md') : archivePath
    const text = await readFile(skillMdPath, 'utf8')
    return parseFrontmatter(text)
  } catch {
    return null
  }
}

async function scanArchivedSkills(archiveDir: string): Promise<Map<string, ArchivedSkillEntry>> {
  const archivedSkills = new Map<string, ArchivedSkillEntry>()
  if (!existsSync(archiveDir)) return archivedSkills

  const dirents = await readdir(archiveDir, { withFileTypes: true })
  for (const dirent of dirents) {
    if (dirent.name.endsWith('.meta.json')) continue

    const id = dirent.isDirectory() ? dirent.name : basename(dirent.name, extname(dirent.name))
    const archivePath = join(archiveDir, dirent.name)
    archivedSkills.set(id, {
      archive_path: archivePath,
      meta: await readArchiveMeta(join(archiveDir, `${id}.meta.json`)),
      frontmatter: await readArchiveFrontmatter(archivePath),
    })
  }

  return archivedSkills
}

function buildSkillRecord(args: {
  id: string
  status: ProjectSkillStatus
  library_path: string | null
  library_checksum: string | null
  project: ActiveSkillEntry | null
  project_archive: ArchivedSkillEntry | null
  global: ActiveSkillEntry | null
  global_archive: ArchivedSkillEntry | null
  frontmatter: SkillFrontmatter | null
}): ProjectSkill {
  const {
    id,
    status,
    library_path,
    library_checksum,
    project,
    project_archive,
    global,
    global_archive,
    frontmatter,
  } = args

  const projectOriginalRels = project_archive?.meta?.original_rels ?? []
  const globalOriginalRels = global_archive?.meta?.original_rels ?? []
  const preferred_enable_scope: 'project' | 'global' =
    project_archive
      ? 'project'
      : global_archive && !global
        ? 'global'
        : 'project'

  return {
    id,
    name: id,
    status,
    library_path,
    library_checksum,
    project_path: project?.path ?? null,
    project_checksum: project?.checksum ?? null,
    project_rel: project?.rel ?? null,
    archive_path: project_archive?.archive_path ?? null,
    original_rel: projectOriginalRels[0] ?? null,
    all_project_paths: project?.paths ?? [],
    all_project_rels: project?.rels ?? [],
    home_paths: global?.paths ?? [],
    global_paths: global?.paths ?? [],
    global_rels: global?.rels ?? [],
    is_global: Boolean(global),
    global_archive_path: global_archive?.archive_path ?? null,
    global_original_rels: globalOriginalRels,
    preferred_enable_scope,
    original_rels: projectOriginalRels,
    frontmatter,
  }
}

export async function listProjectSkills(
  projectPath: string,
  homeOverride?: string,
): Promise<ProjectSkillsResult> {
  const [config, registry] = await Promise.all([
    readConfig(homeOverride),
    readRegistry(homeOverride),
  ])

  const home = homeOverride ?? homedir()
  const projectArchives = getProjectArchivePaths(projectPath, homeOverride)
  const globalArchives = getGlobalSkillArchivePaths(homeOverride)
  const projectName = basename(projectPath)

  const projectSkills = new Map<string, ActiveSkillEntry>()
  const globalSkills = new Map<string, ActiveSkillEntry>()

  for (const entry of config.skill_dirs) {
    await scanActiveSkills(join(projectPath, entry.rel), entry.rel, projectSkills)
    await scanActiveSkills(join(home, entry.rel), entry.rel, globalSkills)
  }

  const [projectArchivedSkills, globalArchivedSkills] = await Promise.all([
    scanArchivedSkills(projectArchives.skillsDir),
    scanArchivedSkills(globalArchives.skillsDir),
  ])

  const skills: ProjectSkill[] = []
  const seen = new Set<string>()

  const libraryFrontmatterCache = new Map<string, SkillFrontmatter | null>()
  async function getLibraryFrontmatter(libraryPath: string | null): Promise<SkillFrontmatter | null> {
    if (!libraryPath) return null
    if (libraryFrontmatterCache.has(libraryPath)) return libraryFrontmatterCache.get(libraryPath) ?? null

    const frontmatter = await readFrontmatterFromFile(libraryPath)
    libraryFrontmatterCache.set(libraryPath, frontmatter)
    return frontmatter
  }

  const librarySkills = Object.values(registry.mods).filter(mod => mod.type === 'skill')
  for (const library of librarySkills) {
    seen.add(library.id)

    const projectSkill = projectSkills.get(library.id) ?? null
    const globalSkill = globalSkills.get(library.id) ?? null
    const projectArchive = projectArchivedSkills.get(library.id) ?? null
    const globalArchive = globalArchivedSkills.get(library.id) ?? null
    const activeSkill = projectSkill ?? globalSkill
    const checksumMatch = activeSkill !== null
      && library.checksum !== null
      && activeSkill.checksum === library.checksum

    const status: ProjectSkillStatus = activeSkill
      ? checksumMatch ? 'library-active' : 'local-modified'
      : projectArchive
        ? 'archived'
        : 'library-inactive'

    const frontmatter =
      projectSkill?.frontmatter
      ?? globalSkill?.frontmatter
      ?? projectArchive?.frontmatter
      ?? globalArchive?.frontmatter
      ?? await getLibraryFrontmatter(library.path)

    skills.push(buildSkillRecord({
      id: library.id,
      status,
      library_path: library.path,
      library_checksum: library.checksum,
      project: projectSkill,
      project_archive: projectArchive,
      global: globalSkill,
      global_archive: globalArchive,
      frontmatter,
    }))
  }

  const nonLibraryIds = new Set<string>([
    ...projectSkills.keys(),
    ...globalSkills.keys(),
    ...projectArchivedSkills.keys(),
    ...globalArchivedSkills.keys(),
  ])

  for (const id of nonLibraryIds) {
    if (seen.has(id)) continue
    seen.add(id)

    const projectSkill = projectSkills.get(id) ?? null
    const globalSkill = globalSkills.get(id) ?? null
    const projectArchive = projectArchivedSkills.get(id) ?? null
    const globalArchive = globalArchivedSkills.get(id) ?? null
    const activeSkill = projectSkill ?? globalSkill

    skills.push(buildSkillRecord({
      id,
      status: activeSkill ? 'local-unique' : 'archived',
      library_path: null,
      library_checksum: null,
      project: projectSkill,
      project_archive: projectArchive,
      global: globalSkill,
      global_archive: globalArchive,
      frontmatter:
        projectSkill?.frontmatter
        ?? globalSkill?.frontmatter
        ?? projectArchive?.frontmatter
        ?? globalArchive?.frontmatter
        ?? null,
    }))
  }

  const existingEntries = config.skill_dirs.filter(entry => existsSync(join(projectPath, entry.rel)))
  const primaryEntry = existingEntries[0] ?? config.skill_dirs[0]
  const primary_skill_rel = primaryEntry?.rel ?? '.claude/skills'
  const active_skill_rels = existingEntries.map(entry => entry.rel)

  return {
    project_path: projectPath,
    project_name: projectName,
    skills,
    primary_skill_rel,
    active_skill_rels,
  }
}
