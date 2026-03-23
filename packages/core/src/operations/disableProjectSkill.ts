import { copyFile, writeFile, rm, cp } from 'node:fs/promises'
import { join, extname, basename, dirname } from 'node:path'
import { AideError } from '../errors/AideError.js'
import { ensureProjectArchiveDir } from '../fs/aideDir.js'
import { listProjectSkills } from './listProjectSkills.js'
import type { ArchivedSkillMeta } from './listProjectSkills.js'

export interface DisableProjectSkillResult {
  archived_to: string
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

  const warnings: string[] = []
  if (skill.home_paths.length > 0) {
    warnings.push(
      `Skill also exists at home level (${skill.home_paths.join(', ')}). ` +
      `These are global copies and were not removed.`
    )
  }

  return { archived_to: archiveDest, warnings }
}
