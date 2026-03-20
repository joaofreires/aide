import { resolveBuiltinVariables } from '../templates/variables.js'
import {
  linkProject,
  unlinkProject as unlinkProjectInRegistry,
  getLinkedProject,
} from '../registry/registry.js'
import type { LinkOptions, LinkResult, UnlinkResult } from './types.js'

/**
 * Links a project to Aide, storing its variables for template propagation.
 */
export async function link(options: LinkOptions): Promise<LinkResult> {
  const { projectPath, variables: callsiteVars = {}, homeOverride } = options

  const existing = await getLinkedProject(projectPath, homeOverride)
  const builtins = await resolveBuiltinVariables({ projectPath })
  const variables = { ...builtins, ...callsiteVars }

  await linkProject(
    projectPath,
    {
      linked_at: new Date().toISOString(),
      applied_templates: [],
      variables,
    },
    homeOverride,
  )

  return {
    projectPath,
    variables,
    already_linked: !!existing,
  }
}

/**
 * Unlinks a project, removing it from registry (context files are left in place).
 */
export async function unlink(projectPath: string, homeOverride?: string): Promise<UnlinkResult> {
  await unlinkProjectInRegistry(projectPath, homeOverride)
  return { projectPath }
}
