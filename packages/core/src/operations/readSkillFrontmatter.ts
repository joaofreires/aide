import { readFile } from 'node:fs/promises'
import { parseFrontmatter, type SkillFrontmatter } from '../skills/frontmatter.js'

export type { SkillFrontmatter }

export async function readSkillFrontmatter(filePath: string): Promise<SkillFrontmatter | null> {
  try {
    const text = await readFile(filePath, 'utf8')
    return parseFrontmatter(text)
  } catch {
    return null
  }
}
