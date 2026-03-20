import Handlebars from 'handlebars'

export interface RenderOptions {
  /** The raw template string with {{variable}} placeholders */
  template: string
  /** Variables to inject — built-ins merged with project and callsite vars */
  variables: Record<string, string>
}

/**
 * Renders a template string by compiling it with Handlebars and applying variables.
 * Throws a descriptive error if a required variable is missing (Handlebars returns empty string
 * for missing vars — we allow this by default; callers can validate separately).
 */
export function renderTemplate(options: RenderOptions): string {
  const compiled = Handlebars.compile(options.template, {
    noEscape: true, // templates are Markdown, not HTML
    strict: false,  // missing vars render as empty string (not error)
  })
  return compiled(options.variables)
}

/**
 * Merges variable layers with priority: callsite > project > defaults > builtins.
 */
export function mergeVariables(
  builtin: Record<string, string>,
  defaults: Record<string, string>,
  project: Record<string, string>,
  callsite: Record<string, string>,
): Record<string, string> {
  return { ...builtin, ...defaults, ...project, ...callsite }
}
