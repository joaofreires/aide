import { copyFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename, dirname, extname } from 'node:path'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { ensureAideDir, getAidePaths } from '../fs/aideDir.js'
import { addMod as addModToRegistry } from '../registry/registry.js'
import { assertValidMod } from '../mods/validator.js'
import { assertExecutable } from '../fs/permissions.js'
import { AideError } from '../errors/AideError.js'
import type { InstalledMod, ModType } from '../registry/schema.js'

export interface AddOptions {
  /** Path to the local file to add */
  filePath: string
  /** Mod type: 'agent', 'skill', or 'template' */
  type: ModType
  /** Optional override for the mod ID (defaults to filename without extension) */
  id?: string
  /** Optional version string (defaults to '1.0.0') */
  version?: string
  homeOverride?: string
}

export interface AddResult {
  mod: InstalledMod
  destination: string
}

/**
 * Adds a local mod file to the global ~/.aide storage and registers it.
 */
export async function add(options: AddOptions): Promise<AddResult> {
  const { filePath, type, homeOverride } = options

  if (!existsSync(filePath)) {
    throw new AideError(`File not found: ${filePath}`, 'FILE_NOT_FOUND')
  }

  assertValidMod(filePath, type)

  // SKILL.md files (Agent Skills standard) are not executable; only legacy scripts need the check
  if (type === 'skill' && extname(filePath).toLowerCase() !== '.md') {
    await assertExecutable(filePath)
  }

  const paths = await ensureAideDir(homeOverride)
  const destDir = type === 'agent' ? paths.agents : type === 'skill' ? paths.skills : paths.templates
  // For SKILL.md, use the parent directory name as the identifier
  const isSkillMd = basename(filePath) === 'SKILL.md'
  const filename = isSkillMd ? basename(dirname(filePath)) + '.md' : basename(filePath)
  const id = options.id ?? (isSkillMd ? basename(dirname(filePath)) : basename(filePath, extname(filePath)))
  const destination = join(destDir, filename)

  await copyFile(filePath, destination)

  const content = await readFile(destination, 'utf8')
  const checksum = 'sha256:' + createHash('sha256').update(content).digest('hex')

  const mod: InstalledMod = {
    id,
    type,
    source: 'local',
    source_url: null,
    installed_at: new Date().toISOString(),
    version: options.version ?? '1.0.0',
    path: destination,
    checksum,
    executable: type === 'skill' ? true : undefined,
  }

  await addModToRegistry(mod, homeOverride)

  return { mod, destination }
}
