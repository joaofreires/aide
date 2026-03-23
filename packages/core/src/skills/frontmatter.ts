export interface SkillFrontmatter {
  name: string | null
  description: string | null
  license: string | null
  compatibility: string | null
  metadata: Record<string, string> | null
  allowed_tools: string | null
}

export function parseFrontmatter(content: string): SkillFrontmatter | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match || !match[1]) return null
  const yaml: string = match[1]

  const result: SkillFrontmatter = {
    name: null, description: null, license: null,
    compatibility: null, metadata: null, allowed_tools: null,
  }

  const lines = yaml.split(/\r?\n/)
  let inMetadata = false
  const meta: Record<string, string> = {}

  for (const line of lines) {
    if (inMetadata) {
      const m = line.match(/^  ([^:]+):\s*(.*)/)
      if (m && m[1] && m[2] !== undefined) { meta[m[1].trim()] = m[2].trim(); continue }
      inMetadata = false
    }
    const top = line.match(/^([a-zA-Z_-]+):\s*(.*)/)
    if (!top || !top[1] || top[2] === undefined) continue
    const key = top[1].trim()
    const val = top[2].trim()
    if (key === 'metadata' && val === '') { inMetadata = true; continue }
    if (key === 'name') result.name = val || null
    else if (key === 'description') result.description = val || null
    else if (key === 'license') result.license = val || null
    else if (key === 'compatibility') result.compatibility = val || null
    else if (key === 'allowed-tools') result.allowed_tools = val || null
  }

  if (Object.keys(meta).length > 0) result.metadata = meta
  return result
}
