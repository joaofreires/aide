export const AIDE_TAG_COMMENT = 'AIDE'

/**
 * Generates the opening AIDE tag comment.
 */
export function makeStartTag(templateId: string, version = '1'): string {
  return `<!-- AIDE:START id="${templateId}" version="${version}" -->`
}

/**
 * Generates the closing AIDE tag comment.
 */
export function makeEndTag(templateId: string): string {
  return `<!-- AIDE:END id="${templateId}" -->`
}

export interface AideSection {
  templateId: string
  version: string
  /** Full content between (and including) the AIDE tags */
  full: string
  /** Content between the tags (not including the tags themselves) */
  inner: string
  /** Start index in the parent string */
  startIndex: number
  /** End index in the parent string (exclusive) */
  endIndex: number
}

/**
 * Finds all AIDE-managed sections in a file's content.
 */
export function findAideSections(content: string): AideSection[] {
  const sections: AideSection[] = []
  // Match opening tag, capture id and version, then everything up to the closing tag
  const pattern = /<!-- AIDE:START id="([^"]+)" version="([^"]+)" -->([\s\S]*?)<!-- AIDE:END id="\1" -->/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content)) !== null) {
    const [full, templateId, version, inner] = match
    if (!templateId || !version || inner === undefined || full === undefined) continue
    sections.push({
      templateId,
      version,
      full,
      inner,
      startIndex: match.index,
      endIndex: match.index + full.length,
    })
  }

  return sections
}

/**
 * Wraps rendered content in AIDE management tags.
 */
export function wrapInTags(templateId: string, content: string, version = '1'): string {
  return `${makeStartTag(templateId, version)}\n${content}\n${makeEndTag(templateId)}`
}
