import { copyFile, cp, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, basename } from 'node:path'
import { AideError } from '../errors/AideError.js'
import { getGlobalSkillArchivePaths, getProjectArchivePaths } from '../fs/aideDir.js'
import { readConfig } from '../config/config.js'
import { listProjectSkills } from './listProjectSkills.js'
import type { ArchivedSkillMeta } from './listProjectSkills.js'

export interface EnableProjectSkillResult {
  enabled_to: string
  enabled_scope: 'project' | 'global'
  restore_warning: string | null
}

function restoredPathForTarget(archivePath: string, targetDir: string, skillId: string, meta: ArchivedSkillMeta | null): string {
  if (meta?.was_skill_md || basename(archivePath) === skillId) {
    return join(targetDir, skillId)
  }
  return join(targetDir, basename(archivePath))
}

async function readArchivedMeta(metaPath: string): Promise<ArchivedSkillMeta | null> {
  if (!existsSync(metaPath)) return null

  try {
    const raw = JSON.parse(await readFile(metaPath, 'utf8'))
    if (!raw.original_rels && raw.original_rel) raw.original_rels = [raw.original_rel]
    raw.original_rels ??= []
    return raw as ArchivedSkillMeta
  } catch {
    return null
  }
}

async function restoreArchivedCopy(
  archivePath: string,
  targetDir: string,
  skillId: string,
  meta: ArchivedSkillMeta | null,
): Promise<void> {
  await mkdir(targetDir, { recursive: true })
  const archiveStat = await stat(archivePath)

  if (archiveStat.isDirectory()) {
    await cp(archivePath, join(targetDir, skillId), { recursive: true })
    return
  }

  if (meta?.was_skill_md) {
    const content = await readFile(archivePath)
    const skillDir = join(targetDir, skillId)
    await mkdir(skillDir, { recursive: true })
    await writeFile(join(skillDir, 'SKILL.md'), content)
    return
  }

  await copyFile(archivePath, join(targetDir, basename(archivePath)))
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

  if (skill.preferred_enable_scope === 'global' && skill.global_archive_path) {
    const archPaths = getGlobalSkillArchivePaths(homeOverride)
    const metaPath = join(archPaths.skillsDir, skillId + '.meta.json')
    const meta = await readArchivedMeta(metaPath)
    const home = homeOverride ?? homedir()
    const rels = targetRels?.length
      ? targetRels
      : meta?.original_rels?.length
        ? meta.original_rels
        : [config.skill_dirs[0]?.rel ?? '.codex/skills']

    const restoredTo: string[] = []
    for (const rel of rels) {
      const targetDir = join(home, rel)
      await restoreArchivedCopy(skill.global_archive_path, targetDir, skillId, meta)
      restoredTo.push(restoredPathForTarget(skill.global_archive_path, targetDir, skillId, meta))
    }

    await rm(skill.global_archive_path, { recursive: true, force: true })
    await rm(metaPath, { force: true })

    return {
      enabled_to: restoredTo[0] ?? join(home, rels[0] ?? ''),
      enabled_scope: 'global',
      restore_warning: null,
    }
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
    return { enabled_to: restoredTo[0]!, enabled_scope: 'project', restore_warning: null }
  }

  // ── Restore archived skill ─────────────────────────────────────────────────
  const archPaths = getProjectArchivePaths(projectPath, homeOverride)
  const metaPath = join(archPaths.skillsDir, skillId + '.meta.json')
  const meta = await readArchivedMeta(metaPath)

  // Determine target rels: explicit selection > archived meta > primary fallback
  const originalRels: string[] = targetRels?.length
    ? targetRels
    : meta?.original_rels?.length ? meta.original_rels : [result.primary_skill_rel]
  const archivePath = skill.archive_path ?? join(archPaths.skillsDir, skillId + '.md')

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
    await restoreArchivedCopy(archivePath, targetDir, skillId, meta)
    restoredTo.push(targetDir)
  }

  // Fallback: if nothing was restored, use primary skill dir
  if (restoredTo.length === 0) {
    const fallbackDir = join(projectPath, result.primary_skill_rel)
    await restoreArchivedCopy(archivePath, fallbackDir, skillId, meta)
    restoredTo.push(fallbackDir)
    restore_warning = `All original dirs gone. Restored to ${result.primary_skill_rel}`
  }

  // Clean up archive
  await rm(archivePath, { recursive: true, force: true })
  await rm(metaPath, { force: true })

  return { enabled_to: restoredTo[0]!, enabled_scope: 'project', restore_warning }
}
