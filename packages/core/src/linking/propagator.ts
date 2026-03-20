import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readRegistry } from '../registry/registry.js'
import { apply, writeApplyResult } from '../operations/apply.js'
import { getAidePaths } from '../fs/aideDir.js'

export interface PropagateOptions {
  homeOverride?: string
  /** If provided, only propagate changes to this specific template */
  templateName?: string
}

export interface PropagateResult {
  propagated: Array<{
    projectPath: string
    templateName: string
    action: string
  }>
  skipped: Array<{
    projectPath: string
    templateName: string
    reason: string
  }>
}

/**
 * Propagates template changes to all linked projects.
 * Skips projects that no longer exist on disk.
 * Only runs for templates that each project has previously applied.
 */
export async function propagate(options: PropagateOptions = {}): Promise<PropagateResult> {
  const { homeOverride, templateName } = options
  const registry = await readRegistry(homeOverride)
  const paths = getAidePaths(homeOverride)

  const result: PropagateResult = { propagated: [], skipped: [] }

  for (const linked of Object.values(registry.linked_projects)) {
    const { project_path, applied_templates } = linked

    if (!existsSync(project_path)) {
      const templatesToSkip = templateName ? [templateName] : applied_templates
      for (const t of templatesToSkip) {
        result.skipped.push({
          projectPath: project_path,
          templateName: t,
          reason: 'Project directory no longer exists',
        })
      }
      continue
    }

    const templatesToPropagate = templateName
      ? applied_templates.includes(templateName) ? [templateName] : []
      : applied_templates

    for (const tmpl of templatesToPropagate) {
      const templatePath = join(paths.templates, tmpl)
      if (!existsSync(templatePath)) {
        result.skipped.push({
          projectPath: project_path,
          templateName: tmpl,
          reason: `Template "${tmpl}" no longer exists in ~/.aide/templates/`,
        })
        continue
      }

      try {
        const applyResult = await apply({
          templateName: tmpl,
          projectPath: project_path,
          ...(homeOverride !== undefined ? { homeOverride } : {}),
        })

        if (applyResult.action !== 'skipped') {
          await writeApplyResult(applyResult)
        }

        result.propagated.push({
          projectPath: project_path,
          templateName: tmpl,
          action: applyResult.action,
        })
      } catch (err) {
        result.skipped.push({
          projectPath: project_path,
          templateName: tmpl,
          reason: String(err),
        })
      }
    }
  }

  return result
}
