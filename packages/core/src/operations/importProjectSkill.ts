import { basename } from 'node:path'
import { AideError } from '../errors/AideError.js'
import { readRegistry } from '../registry/registry.js'
import { add } from './add.js'
import { listProjectSkills } from './listProjectSkills.js'

export interface ImportProjectSkillResult {
  imported_as: string
}

export async function importProjectSkill(
  projectPath: string,
  skillId: string,
  homeOverride?: string,
): Promise<ImportProjectSkillResult> {
  const [result, registry] = await Promise.all([
    listProjectSkills(projectPath, homeOverride),
    readRegistry(homeOverride),
  ])
  const skill = result.skills.find(s => s.id === skillId)

  if (!skill) {
    throw new AideError(`Skill "${skillId}" not found in project`, 'SKILL_NOT_FOUND')
  }
  if (!['local-unique', 'local-modified'].includes(skill.status)) {
    throw new AideError(`Only local skills can be imported (status: ${skill.status})`, 'INVALID_STATE')
  }
  if (!skill.project_path) {
    throw new AideError(`Skill "${skillId}" has no project path`, 'SKILL_NOT_FOUND')
  }

  const projectName = basename(projectPath)
  const existingIds = new Set(Object.keys(registry.mods))

  // local-modified always gets namespaced; local-unique gets namespaced only on collision
  const targetId =
    skill.status === 'local-modified' || existingIds.has(skillId)
      ? `${skillId} (${projectName})`
      : skillId

  // Check for collision on the namespaced id too
  if (existingIds.has(targetId)) {
    throw new AideError(
      `Skill already imported as "${targetId}". Remove it first to re-import.`,
      'MOD_ALREADY_EXISTS',
    )
  }

  await add({
    filePath: skill.project_path,
    type: 'skill',
    id: targetId,
    ...(homeOverride !== undefined ? { homeOverride } : {}),
  })

  return { imported_as: targetId }
}
