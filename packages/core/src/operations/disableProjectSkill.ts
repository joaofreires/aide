import { copyFile, writeFile, rm, cp } from 'node:fs/promises'
import { join, extname, basename, dirname } from 'node:path'
import { AideError } from '../errors/AideError.js'
import { ensureGlobalSkillArchiveDir, ensureProjectArchiveDir } from '../fs/aideDir.js'
import { listProjectSkills } from './listProjectSkills.js'
import type { ArchivedSkillMeta } from './listProjectSkills.js'

export interface DisableProjectSkillResult {
  archived_to: string
  disabled_scope: 'project' | 'global'
  warnings: string[]
}

export async function disableProjectSkill(
  projectPath: string,
  skillId: string,
  homeOverride?: string,
): Promise<DisableProjectSkillResult> {
  const result = await listProjectSkills(projectPath, homeOverride)
  const skill = result.skills.find(s => s.id === skillId)

  if (!skill) {
    throw new AideError(`Skill "${skillId}" not found in project`, 'SKILL_NOT_FOUND')
  }
  if (!['library-active', 'local-unique', 'local-modified'].includes(skill.status)) {
    throw new AideError(`Skill "${skillId}" cannot be disabled (status: ${skill.status})`, 'INVALID_STATE')
  }

  if (skill.is_global) {
    if (skill.global_paths.length === 0) {
      throw new AideError(`Skill "${skillId}" has no global path`, 'SKILL_NOT_FOUND')
    }

    const archPaths = await ensureGlobalSkillArchiveDir(homeOverride)
    const sourcePath = skill.global_paths[0]!
    const isSkillMd = basename(sourcePath) === 'SKILL.md'

    let archiveDest: string
    if (isSkillMd) {
      archiveDest = join(archPaths.skillsDir, skillId)
      await cp(dirname(sourcePath), archiveDest, { recursive: true })
    } else {
      archiveDest = join(archPaths.skillsDir, skillId + extname(sourcePath))
      await copyFile(sourcePath, archiveDest)
    }

    const meta: ArchivedSkillMeta = {
      id: skillId,
      original_rels: skill.global_rels,
      archived_at: new Date().toISOString(),
      was_skill_md: isSkillMd,
    }
    await writeFile(
      join(archPaths.skillsDir, skillId + '.meta.json'),
      JSON.stringify(meta, null, 2),
    )

    for (const path of skill.global_paths) {
      if (basename(path) === 'SKILL.md') {
        await rm(dirname(path), { recursive: true, force: true })
      } else {
        await rm(path, { force: true })
      }
    }

    const warnings: string[] = []
    if (skill.all_project_paths.length > 0) {
      warnings.push(
        `Project-local copies remain active (${skill.all_project_paths.join(', ')}). ` +
        'Only global copies were removed.'
      )
    }

    return { archived_to: archiveDest, disabled_scope: 'global', warnings }
  }

  if (!skill.project_path) {
    throw new AideError(`Skill "${skillId}" has no project path`, 'SKILL_NOT_FOUND')
  }

  const archPaths = await ensureProjectArchiveDir(projectPath, homeOverride)
  const isSkillMd = basename(skill.project_path) === 'SKILL.md'

  // Archive: directory-based skills get archived as a dir; flat files as {id}.md
  let archiveDest: string
  if (isSkillMd) {
    archiveDest = join(archPaths.skillsDir, skillId)
    await cp(dirname(skill.project_path), archiveDest, { recursive: true })
  } else {
    archiveDest = join(archPaths.skillsDir, skillId + extname(skill.project_path))
    await copyFile(skill.project_path, archiveDest)
  }

  const meta: ArchivedSkillMeta = {
    id: skillId,
    original_rels: skill.all_project_rels,
    archived_at: new Date().toISOString(),
    was_skill_md: isSkillMd,
  }
  await writeFile(
    join(archPaths.skillsDir, skillId + '.meta.json'),
    JSON.stringify(meta, null, 2),
  )

  // Remove ALL project-level copies
  for (const p of skill.all_project_paths) {
    if (basename(p) === 'SKILL.md') {
      await rm(dirname(p), { recursive: true, force: true })
    } else {
      await rm(p, { force: true })
    }
  }

  return { archived_to: archiveDest, disabled_scope: 'project', warnings: [] }
}
