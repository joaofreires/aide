import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { getAidePaths } from '../fs/aideDir.js'
import { readConfig } from '../config/config.js'
import { getLinkedProject } from '../registry/registry.js'
import { renderTemplate, mergeVariables } from '../templates/engine.js'
import { resolveBuiltinVariables } from '../templates/variables.js'
import { merge, type MergeResult } from '../conflict/merger.js'
import { TemplateNotFoundError } from '../errors/AideError.js'

export interface ApplyOptions {
  /** Name of the template to apply (e.g. "CLAUDE.md") */
  templateName: string
  /** Absolute path to the project directory */
  projectPath: string
  /** Extra variables from the command line to override */
  variables?: Record<string, string>
  homeOverride?: string
}

export interface ApplyResult extends MergeResult {
  /** The target file path */
  file: string
  /** The template name */
  templateName: string
}

/**
 * Renders a template and merges it into the target file in the project directory.
 * Does NOT write to disk — returns a result that callers must commit with writeApplyResult().
 */
export async function apply(options: ApplyOptions): Promise<ApplyResult> {
  const { templateName, projectPath, variables: callsiteVars = {}, homeOverride } = options
  const paths = getAidePaths(homeOverride)
  const templatePath = join(paths.templates, templateName)

  if (!existsSync(templatePath)) {
    throw new TemplateNotFoundError(templateName)
  }

  const [rawTemplate, config, builtins, linkedProject] = await Promise.all([
    readFile(templatePath, 'utf8'),
    readConfig(homeOverride),
    resolveBuiltinVariables({ projectPath }),
    getLinkedProject(projectPath, homeOverride).catch(() => undefined),
  ])

  const projectVars = linkedProject?.variables ?? {}
  const mergedVars = mergeVariables(builtins, config.default_variables, projectVars, callsiteVars)

  const rendered = renderTemplate({ template: rawTemplate, variables: mergedVars })
  const targetPath = join(projectPath, templateName)
  const existing = existsSync(targetPath) ? await readFile(targetPath, 'utf8') : null

  const mergeResult = merge({
    existing,
    rendered,
    templateId: templateName,
    variables_injected: Object.keys(mergedVars).filter(k => rendered.includes(`{{${k}}}`)),
  })

  return {
    ...mergeResult,
    file: targetPath,
    templateName,
  }
}

/**
 * Writes an apply result to disk. Call this after confirming with the user if needed.
 */
export async function writeApplyResult(result: ApplyResult): Promise<void> {
  await writeFile(result.file, result.content, 'utf8')
}
