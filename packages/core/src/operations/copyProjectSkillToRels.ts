import { copyFile, cp, mkdir } from 'node:fs/promises'
import { join, basename, dirname } from 'node:path'
import { AideError } from '../errors/AideError.js'
import { listProjectSkills } from './listProjectSkills.js'

export interface CopyProjectSkillResult {
  copied_to: string[]
}

export async function copyProjectSkillToRels(
  projectPath: string,
  skillId: string,
  targetRels?: string[],
  homeOverride?: string,
): Promise<CopyProjectSkillResult> {
  const result = await listProjectSkills(projectPath, homeOverride)
  const skill = result.skills.find(s => s.id === skillId)

  if (!skill) {
    throw new AideError(`Skill "${skillId}" not found in project`, 'SKILL_NOT_FOUND')
  }
  if (!skill.project_path) {
    throw new AideError(`Skill "${skillId}" has no project path`, 'SKILL_NOT_FOUND')
  }

  // Default: all active skill dirs that don't already have this skill
  const rels = targetRels?.length
    ? targetRels
    : result.active_skill_rels.filter(r => !skill.all_project_rels.includes(r))

  const isSkillMd = basename(skill.project_path) === 'SKILL.md'
  const copiedTo: string[] = []

  for (const rel of rels) {
    const targetDir = join(projectPath, rel)
    await mkdir(targetDir, { recursive: true })
    if (isSkillMd) {
      const dest = join(targetDir, skillId)
      await cp(dirname(skill.project_path), dest, { recursive: true })
      copiedTo.push(dest)
    } else {
      const dest = join(targetDir, basename(skill.project_path))
      await copyFile(skill.project_path, dest)
      copiedTo.push(dest)
    }
  }

  return { copied_to: copiedTo }
}
