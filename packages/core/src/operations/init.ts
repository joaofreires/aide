import { writeFile, existsSync } from 'node:fs'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { ensureAideDir } from '../fs/aideDir.js'
import { writeConfig } from '../config/config.js'
import { writeRegistry } from '../registry/registry.js'
import { DEFAULT_CONFIG } from '../config/schema.js'
import { DEFAULT_REGISTRY } from '../registry/schema.js'
import { DEFAULT_TEMPLATES } from '../templates/defaults.js'

const writeFileAsync = promisify(writeFile)

export interface InitResult {
  aideDir: string
  created_templates: string[]
  already_existed: boolean
}

/**
 * Initializes the ~/.aide directory with default templates and config.
 * Safe to run multiple times — will not overwrite existing files.
 */
export async function init(homeOverride?: string): Promise<InitResult> {
  const paths = await ensureAideDir(homeOverride)
  const already_existed = existsSync(paths.config)

  // Write config only if it doesn't already exist
  if (!existsSync(paths.config)) {
    await writeConfig(DEFAULT_CONFIG, homeOverride)
  }

  // Write registry only if it doesn't already exist
  if (!existsSync(paths.registry)) {
    await writeRegistry(DEFAULT_REGISTRY, homeOverride)
  }

  // Write default templates only if they don't exist
  const created_templates: string[] = []
  for (const [name, content] of Object.entries(DEFAULT_TEMPLATES)) {
    const templatePath = join(paths.templates, name)
    if (!existsSync(templatePath)) {
      await writeFileAsync(templatePath, content, 'utf8')
      created_templates.push(name)
    }
  }

  return {
    aideDir: paths.root,
    created_templates,
    already_existed,
  }
}
