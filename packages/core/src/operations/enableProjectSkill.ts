import { copyFile, cp, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { AideError } from '../errors/AideError.js'
import { getProjectArchivePaths } from '../fs/aideDir.js'
import { readConfig } from '../config/config.js'
import { listProjectSkills } from './listProjectSkills.js'
import type { ArchivedSkillMeta } from './listProjectSkills.js'

export interface EnableProjectSkillResult {
  enabled_to: string
  restore_warning: string | null
}

export async function enableProjectSkill(
  projectPath: string,
  skillId: string,
  homeOverride?: string,
  targetRels?: string[],
): Promise<EnableProjectSkillResult> {
  const [result, config] = await Promise.all([
    listProjectSkills(projectPath, homeOverride),
    readConfig(homeOverride),
  ])
  const skill = result.skills.find(s => s.id === skillId)

  if (!skill) {
    throw new AideError(`Skill "${skillId}" not found`, 'SKILL_NOT_FOUND')
  }
  if (!['library-inactive', 'archived'].includes(skill.status)) {
    throw new AideError(`Skill "${skillId}" cannot be enabled (status: ${skill.status})`, 'INVALID_STATE')
  }

  // ── Enable library skill into project ─────────────────────────────────────
  if (skill.status === 'library-inactive') {
    if (!skill.library_path) {
      throw new AideError(`Library path missing for "${skillId}"`, 'SKILL_NOT_FOUND')
    }
    const rels = targetRels?.length ? targetRels : [result.primary_skill_rel]
    const restoredTo: string[] = []
    for (const rel of rels) {
      const targetDir = join(projectPath, rel)
      await mkdir(targetDir, { recursive: true })
      const destPath = join(targetDir, skillId + '.md')
      await copyFile(skill.library_path, destPath)
      restoredTo.push(destPath)
    }
    return { enabled_to: restoredTo[0]!, restore_warning: null }
  }

  // ── Restore archived skill ─────────────────────────────────────────────────
  const archPaths = getProjectArchivePaths(projectPath, homeOverride)
  const metaPath = join(archPaths.skillsDir, skillId + '.meta.json')

  let meta: ArchivedSkillMeta | null = null
  if (existsSync(metaPath)) {
    try {
      const raw = JSON.parse(await readFile(metaPath, 'utf8'))
      // Backward compat: old archives have original_rel (string)
      if (!raw.original_rels && raw.original_rel) raw.original_rels = [raw.original_rel]
      raw.original_rels ??= []
      meta = raw as ArchivedSkillMeta
    } catch { /* skip */ }
  }

  // Determine target rels: explicit selection > archived meta > primary fallback
  const originalRels: string[] = targetRels?.length
    ? targetRels
    : meta?.original_rels?.length ? meta.original_rels : [result.primary_skill_rel]

  // Determine archive format: directory (new) or flat .md file (old)
  const archiveDir = join(archPaths.skillsDir, skillId)
  const archiveFile = join(archPaths.skillsDir, skillId + '.md')
  const isArchivedAsDir =
    existsSync(archiveDir) && (await stat(archiveDir)).isDirectory()

  // Helper: copy skill into a target directory
  async function restoreIntoDir(targetDir: string) {
    await mkdir(targetDir, { recursive: true })
    if (isArchivedAsDir) {
      // New format: full directory archived
      await cp(archiveDir, join(targetDir, skillId), { recursive: true })
    } else if (meta?.was_skill_md) {
      // Old format: was a SKILL.md dir but only SKILL.md was archived
      const content = await readFile(archiveFile)
      const skillDir = join(targetDir, skillId)
      await mkdir(skillDir, { recursive: true })
      await writeFile(join(skillDir, 'SKILL.md'), content)
    } else {
      // Flat .md file
      await copyFile(archiveFile, join(targetDir, basename(archiveFile)))
    }
  }

  let restore_warning: string | null = null
  const restoredTo: string[] = []

  for (const rel of originalRels) {
    const toolDir = dirname(rel)  // e.g. ".codex" from ".codex/skills"
    const targetDir = join(projectPath, rel)
    // Only restore if the AI tool parent dir exists (or rel is at project root)
    if (toolDir !== '.' && !existsSync(join(projectPath, toolDir))) {
      restore_warning = restore_warning
        ? `${restore_warning}, ${rel}`
        : `Some original dirs no longer exist: ${rel}`
      continue
    }
    await restoreIntoDir(targetDir)
    restoredTo.push(targetDir)
  }

  // Fallback: if nothing was restored, use primary skill dir
  if (restoredTo.length === 0) {
    const fallbackDir = join(projectPath, result.primary_skill_rel)
    await restoreIntoDir(fallbackDir)
    restoredTo.push(fallbackDir)
    restore_warning = `All original dirs gone. Restored to ${result.primary_skill_rel}`
  }

  // Clean up archive
  if (isArchivedAsDir) {
    await rm(archiveDir, { recursive: true, force: true })
  } else {
    await rm(archiveFile, { force: true })
  }
  await rm(metaPath, { force: true })

  return { enabled_to: restoredTo[0]!, restore_warning }
}
