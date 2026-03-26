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
  const sourcePath = skill.project_path ?? skill.global_paths[0] ?? null
  if (!sourcePath) {
    throw new AideError(`Skill "${skillId}" has no copy source`, 'SKILL_NOT_FOUND')
  }

  // Default: all active skill dirs that don't already have this skill
  const rels = targetRels?.length
    ? targetRels
    : result.active_skill_rels.filter(r => !skill.all_project_rels.includes(r))

  const isSkillMd = basename(sourcePath) === 'SKILL.md'
  const copiedTo: string[] = []

  for (const rel of rels) {
    const targetDir = join(projectPath, rel)
    await mkdir(targetDir, { recursive: true })
    if (isSkillMd) {
      const dest = join(targetDir, skillId)
      await cp(dirname(sourcePath), dest, { recursive: true })
      copiedTo.push(dest)
    } else {
      const dest = join(targetDir, basename(sourcePath))
      await copyFile(sourcePath, dest)
      copiedTo.push(dest)
    }
  }

  return { copied_to: copiedTo }
}
