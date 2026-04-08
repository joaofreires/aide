import { readConfig } from '../config/config.js'
import { readRegistry } from '../registry/registry.js'
import { parseFrontmatter } from '../skills/frontmatter.js'
import type { SkillFrontmatter } from '../skills/frontmatter.js'

export interface RemoteSkill {
  id: string
  frontmatter: SkillFrontmatter | null
  repo: string
  skillPath: string
  rawUrl: string
  pageUrl: string
  already_installed: boolean
}

interface GitHubEntry {
  name: string
  type: string
}

export async function listRemoteSkills(
  forceRefresh: boolean = false,
  homeOverride?: string
): Promise<RemoteSkill[]> {
  const { readCache, writeCache } = await import('../cache/diskCache.js')
  const CACHE_KEY = 'remote_skills_catalog'

  const config = await readConfig(homeOverride)
  const registry = await readRegistry(homeOverride)
  const installedIds = new Set(Object.values(registry.mods).map(m => m.id))

  if (!forceRefresh) {
    const cached = await readCache<RemoteSkill[]>(CACHE_KEY, homeOverride)
    if (cached) {
      return cached.data.map(pkg => ({
        ...pkg,
        already_installed: installedIds.has(pkg.id)
      }))
    }
  }

  const results: RemoteSkill[] = []

  for (const repoConfig of config.skill_repositories) {
    const { owner, repo, path } = repoConfig
    const repoSlug = `${owner}/${repo}`

    const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    const res = await fetch(contentsUrl, {
      headers: { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    })

    if (!res.ok) continue

    const entries = await res.json() as GitHubEntry[]
    const dirs = entries.filter(e => e.type === 'dir')

    for (const dir of dirs) {
      const skillId = dir.name
      const skillMdPath = `${path}/${skillId}/SKILL.md`
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${skillMdPath}`
      const pageUrl = `https://github.com/${owner}/${repo}/tree/main/${path}/${skillId}`

      let frontmatter: SkillFrontmatter | null = null

      try {
        const mdRes = await fetch(rawUrl)
        if (mdRes.ok) {
          const content = await mdRes.text()
          frontmatter = parseFrontmatter(content)
        }
      } catch {
        // skip if SKILL.md not fetchable
      }

      results.push({
        id: skillId,
        frontmatter,
        repo: repoSlug,
        skillPath: skillMdPath,
        rawUrl,
        pageUrl,
        already_installed: installedIds.has(skillId),
      })
    }
  }

  await writeCache(CACHE_KEY, results, homeOverride)
  return results
}
