import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import { AideError } from '../errors/AideError.js'

const ALLOWED_AGENT_EXTENSIONS = ['.md', '.json', '.txt']
const ALLOWED_SKILL_EXTENSIONS = ['.md', '.sh', '.js', '.ts', '.py', '.rb']
const ALLOWED_TEMPLATE_NAMES = ['CLAUDE.md', 'AGENTS.md', '.cursorrules']

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateModFile(
  filePath: string,
  type: 'agent' | 'skill' | 'template',
): ValidationResult {
  const errors: string[] = []

  if (!existsSync(filePath)) {
    errors.push(`File not found: ${filePath}`)
    return { valid: false, errors }
  }

  const ext = extname(filePath).toLowerCase()

  if (type === 'agent' && !ALLOWED_AGENT_EXTENSIONS.includes(ext)) {
    errors.push(
      `Agent files must have one of these extensions: ${ALLOWED_AGENT_EXTENSIONS.join(', ')}. Got: ${ext}`,
    )
  }

  if (type === 'skill' && !ALLOWED_SKILL_EXTENSIONS.includes(ext)) {
    errors.push(
      `Skill files must have one of these extensions: ${ALLOWED_SKILL_EXTENSIONS.join(', ')}. Got: ${ext}`,
    )
  }

  return { valid: errors.length === 0, errors }
}

export function assertValidMod(
  filePath: string,
  type: 'agent' | 'skill' | 'template',
): void {
  const result = validateModFile(filePath, type)
  if (!result.valid) {
    throw new AideError(result.errors.join('\n'), 'INVALID_MOD')
  }
}
