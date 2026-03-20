import { findAideSections, wrapInTags } from './tags.js'
import { simpleDiff } from './diff.js'

export type MergeAction = 'created' | 'merged' | 'appended' | 'skipped'

export interface MergeResult {
  /** The final file content after merge */
  content: string
  action: MergeAction
  /** True if the caller should confirm before writing (e.g. no existing AIDE tags) */
  requires_confirmation: boolean
  /** Human-readable diff of the managed section change, if any */
  conflict_diff?: string
  /** Which variables were injected */
  variables_injected: string[]
}

export interface MergeOptions {
  /** The existing file content, or null/undefined if the file doesn't exist */
  existing: string | null | undefined
  /** The rendered template content (already variable-substituted) */
  rendered: string
  /** The template identifier (e.g. "CLAUDE.md") */
  templateId: string
  /** Variables that were injected (for reporting) */
  variables_injected?: string[]
  /** Template version string */
  version?: string
}

/**
 * Merges rendered template content into existing file content using AIDE tags.
 *
 * Cases:
 * 1. File does not exist → create with tags
 * 2. File exists, no tags → append managed section, requires_confirmation = true
 * 3. File exists, matching tag id → replace section, diff shown if changed
 * 4. File exists, different tag id → append new section
 */
export function merge(options: MergeOptions): MergeResult {
  const {
    existing,
    rendered,
    templateId,
    variables_injected = [],
    version = '1',
  } = options

  const wrapped = wrapInTags(templateId, rendered, version)

  // Case 1: File does not exist
  if (!existing) {
    return {
      content: wrapped + '\n',
      action: 'created',
      requires_confirmation: false,
      variables_injected,
    }
  }

  const sections = findAideSections(existing)
  const matchingSection = sections.find(s => s.templateId === templateId)

  // Case 3: Matching AIDE section exists — replace in place
  if (matchingSection) {
    if (matchingSection.inner.trim() === rendered.trim()) {
      // No change
      return {
        content: existing,
        action: 'skipped',
        requires_confirmation: false,
        variables_injected,
      }
    }

    const diff = simpleDiff(matchingSection.inner, '\n' + rendered + '\n')
    const newContent =
      existing.slice(0, matchingSection.startIndex) +
      wrapped +
      existing.slice(matchingSection.endIndex)

    return {
      content: newContent,
      action: 'merged',
      requires_confirmation: false,
      conflict_diff: diff,
      variables_injected,
    }
  }

  // Case 2: File exists with no AIDE tags for any template — user content, confirm before appending
  if (sections.length === 0) {
    const newContent = existing.trimEnd() + '\n\n' + wrapped + '\n'
    const diff = simpleDiff('', wrapped)
    return {
      content: newContent,
      action: 'appended',
      requires_confirmation: true,
      conflict_diff: diff,
      variables_injected,
    }
  }

  // Case 4: File has AIDE tags but not for this template — append new section
  const newContent = existing.trimEnd() + '\n\n' + wrapped + '\n'
  return {
    content: newContent,
    action: 'appended',
    requires_confirmation: false,
    variables_injected,
  }
}
