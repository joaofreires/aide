import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, mkdir, writeFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import type { ProjectSkill } from '../../src/operations/listProjectSkills.js'
import { ensureAideDir } from '../../src/fs/aideDir.js'
import { addMod } from '../../src/registry/registry.js'
import { listProjectSkills } from '../../src/operations/listProjectSkills.js'
import { disableProjectSkill } from '../../src/operations/disableProjectSkill.js'
import { enableProjectSkill } from '../../src/operations/enableProjectSkill.js'

let tmpHome: string

type SkillWithGlobal = ProjectSkill & {
  global_paths: string[]
  global_rels: string[]
  is_global: boolean
  global_archive_path: string | null
  global_original_rels: string[]
  preferred_enable_scope: 'project' | 'global'
}

type DisableResultWithScope = Awaited<ReturnType<typeof disableProjectSkill>> & {
  disabled_scope: 'project' | 'global'
}

type EnableResultWithScope = Awaited<ReturnType<typeof enableProjectSkill>> & {
  enabled_scope: 'project' | 'global'
}

const INSTALLED_AT = '2026-03-25T12:00:00.000Z'

beforeEach(async () => {
  tmpHome = await mkdtemp(join(tmpdir(), 'aide-project-skills-'))
  await ensureAideDir(tmpHome)
})

afterEach(async () => {
  await rm(tmpHome, { recursive: true, force: true })
})

function checksum(content: string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function writeSkillFile(filePath: string, content: string): Promise<string> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, content, 'utf8')
  return filePath
}

async function addLibrarySkill(id: string, content: string): Promise<string> {
  const libraryPath = join(tmpHome, '.aide', 'skills', `${id}.md`)
  await writeSkillFile(libraryPath, content)
  await addMod({
    id,
    type: 'skill',
    source: 'local',
    source_url: null,
    installed_at: INSTALLED_AT,
    version: '1.0.0',
    path: libraryPath,
    checksum: checksum(content),
  }, tmpHome)
  return libraryPath
}

async function writeProjectSkill(projectPath: string, rel: string, id: string, content: string): Promise<string> {
  return writeSkillFile(join(projectPath, rel, `${id}.md`), content)
}

async function writeGlobalSkill(rel: string, id: string, content: string): Promise<string> {
  return writeSkillFile(join(tmpHome, rel, `${id}.md`), content)
}

async function writeGlobalArchive(id: string, rels: string[], content: string): Promise<string> {
  const archivePath = join(tmpHome, '.aide', 'global-skills', `${id}.md`)
  await writeSkillFile(archivePath, content)
  await writeFile(
    join(tmpHome, '.aide', 'global-skills', `${id}.meta.json`),
    JSON.stringify({
      id,
      original_rels: rels,
      archived_at: INSTALLED_AT,
      was_skill_md: false,
    }, null, 2),
    'utf8',
  )
  return archivePath
}

async function createProject(name: string): Promise<string> {
  const projectPath = join(tmpHome, 'workspaces', name)
  await mkdir(projectPath, { recursive: true })
  return projectPath
}

async function getSkill(projectPath: string, id: string): Promise<SkillWithGlobal> {
  const result = await listProjectSkills(projectPath, tmpHome)
  const skill = result.skills.find(entry => entry.id === id)
  expect(skill).toBeDefined()
  return skill as SkillWithGlobal
}

describe('listProjectSkills global provider state', () => {
  it('shows a home provider skill as global even when the project has no provider folder', async () => {
    const content = '# Shared skill\n'
    const projectPath = await createProject('alpha')
    const globalPath = await writeGlobalSkill('.codex/skills', 'shared-skill', content)
    await addLibrarySkill('shared-skill', content)

    const skill = await getSkill(projectPath, 'shared-skill')

    expect(skill.status).toBe('library-active')
    expect(skill.project_path).toBeNull()
    expect(skill.is_global).toBe(true)
    expect(skill.global_paths).toEqual([globalPath])
    expect(skill.global_rels).toEqual(['.codex/skills'])
  })

  it('reports mixed project and global copies without losing project status', async () => {
    const content = '# Shared skill\n'
    const projectPath = await createProject('beta')
    const projectSkillPath = await writeProjectSkill(projectPath, '.claude/skills', 'shared-skill', content)
    const globalPath = await writeGlobalSkill('.codex/skills', 'shared-skill', content)
    await addLibrarySkill('shared-skill', content)

    const skill = await getSkill(projectPath, 'shared-skill')

    expect(skill.status).toBe('library-active')
    expect(skill.project_path).toBe(projectSkillPath)
    expect(skill.all_project_paths).toEqual([projectSkillPath])
    expect(skill.is_global).toBe(true)
    expect(skill.global_paths).toEqual([globalPath])
    expect(skill.global_rels).toEqual(['.codex/skills'])
  })

  it('keeps local-unique skills tagged as global when both scopes are present', async () => {
    const content = '# Local only\n'
    const projectPath = await createProject('gamma')
    const projectSkillPath = await writeProjectSkill(projectPath, '.claude/skills', 'local-skill', content)
    const globalPath = await writeGlobalSkill('.codex/skills', 'local-skill', content)

    const skill = await getSkill(projectPath, 'local-skill')

    expect(skill.status).toBe('local-unique')
    expect(skill.project_path).toBe(projectSkillPath)
    expect(skill.is_global).toBe(true)
    expect(skill.global_paths).toEqual([globalPath])
  })

  it('surfaces globally archived skills with a global preferred enable scope', async () => {
    const content = '# Shared skill\n'
    const projectPath = await createProject('delta')
    const archivePath = await writeGlobalArchive('shared-skill', ['.codex/skills'], content)
    await addLibrarySkill('shared-skill', content)

    const skill = await getSkill(projectPath, 'shared-skill')

    expect(skill.status).toBe('library-inactive')
    expect(skill.is_global).toBe(false)
    expect(skill.global_archive_path).toBe(archivePath)
    expect(skill.global_original_rels).toEqual(['.codex/skills'])
    expect(skill.preferred_enable_scope).toBe('global')
  })
})

describe('global disable and enable', () => {
  it('archives and removes a global provider skill for every project', async () => {
    const content = '# Shared skill\n'
    const projectPath = await createProject('omega-a')
    const otherProjectPath = await createProject('omega-b')
    const globalPath = await writeGlobalSkill('.codex/skills', 'shared-skill', content)
    const libraryPath = await addLibrarySkill('shared-skill', content)

    const result = await disableProjectSkill(projectPath, 'shared-skill', tmpHome) as DisableResultWithScope

    expect(result.disabled_scope).toBe('global')
    expect(result.archived_to).toBe(join(tmpHome, '.aide', 'global-skills', 'shared-skill.md'))
    expect(await exists(globalPath)).toBe(false)
    expect(await exists(libraryPath)).toBe(true)

    const current = await getSkill(projectPath, 'shared-skill')
    const other = await getSkill(otherProjectPath, 'shared-skill')
    expect(current.is_global).toBe(false)
    expect(other.is_global).toBe(false)
    expect(current.status).toBe('library-inactive')
    expect(other.status).toBe('library-inactive')
  })

  it('restores a globally archived skill back to the home provider dir instead of the project', async () => {
    const content = '# Shared skill\n'
    const projectPath = await createProject('sigma-a')
    const otherProjectPath = await createProject('sigma-b')
    const globalPath = await writeGlobalSkill('.codex/skills', 'shared-skill', content)
    await addLibrarySkill('shared-skill', content)

    await disableProjectSkill(projectPath, 'shared-skill', tmpHome)
    expect(await exists(globalPath)).toBe(false)

    const result = await enableProjectSkill(otherProjectPath, 'shared-skill', tmpHome) as EnableResultWithScope

    expect(result.enabled_scope).toBe('global')
    expect(result.enabled_to).toBe(globalPath)
    expect(await exists(globalPath)).toBe(true)
    expect(await exists(join(otherProjectPath, '.codex', 'skills', 'shared-skill.md'))).toBe(false)
  })

  it('removes only the global copies for mixed skills and leaves project copies active', async () => {
    const content = '# Shared skill\n'
    const projectPath = await createProject('theta')
    const projectSkillPath = await writeProjectSkill(projectPath, '.claude/skills', 'shared-skill', content)
    const globalPath = await writeGlobalSkill('.codex/skills', 'shared-skill', content)
    await addLibrarySkill('shared-skill', content)

    const result = await disableProjectSkill(projectPath, 'shared-skill', tmpHome) as DisableResultWithScope

    expect(result.disabled_scope).toBe('global')
    expect(result.warnings[0]).toContain('Project-local copies remain active')
    expect(await exists(projectSkillPath)).toBe(true)
    expect(await exists(globalPath)).toBe(false)

    const skill = await getSkill(projectPath, 'shared-skill')
    expect(skill.status).toBe('library-active')
    expect(skill.is_global).toBe(false)
  })

  it('keeps project archive disable and enable behavior unchanged for project-only skills', async () => {
    const content = '# Project only\n'
    const projectPath = await createProject('lambda')
    const projectSkillPath = await writeProjectSkill(projectPath, '.codex/skills', 'local-only', content)

    const disabled = await disableProjectSkill(projectPath, 'local-only', tmpHome) as DisableResultWithScope

    expect(disabled.disabled_scope).toBe('project')
    expect(disabled.archived_to).toBe(join(tmpHome, '.aide', 'projects', 'lambda', 'skills', 'local-only.md'))
    expect(await exists(projectSkillPath)).toBe(false)

    const skillAfterDisable = await getSkill(projectPath, 'local-only')
    expect(skillAfterDisable.status).toBe('archived')
    expect(skillAfterDisable.preferred_enable_scope).toBe('project')

    const enabled = await enableProjectSkill(projectPath, 'local-only', tmpHome) as EnableResultWithScope

    expect(enabled.enabled_scope).toBe('project')
    expect(await exists(projectSkillPath)).toBe(true)
  })
})
