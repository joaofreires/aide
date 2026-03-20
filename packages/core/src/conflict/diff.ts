/**
 * Produces a simple unified-diff-style string showing lines added/removed.
 * This is intentionally minimal — for display purposes only (not patch-compatible).
 */
export function simpleDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  const lines: string[] = []

  const maxLen = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === newLine) {
      lines.push(`  ${oldLine ?? ''}`)
    } else {
      if (oldLine !== undefined) lines.push(`- ${oldLine}`)
      if (newLine !== undefined) lines.push(`+ ${newLine}`)
    }
  }

  return lines.join('\n')
}
