import { readRegistry } from '../registry/registry.js'
import { parseFrontmatter } from '../skills/frontmatter.js'
import type { SkillFrontmatter } from '../skills/frontmatter.js'

export interface SkillsShPackage {
  id: string
  name: string
  description: string
  owner: string
  repo: string
  skillPath: string
  rawUrl: string
  pageUrl: string
  homepageUrl: string
  installs: string
  already_installed: boolean
  frontmatter: SkillFrontmatter | null
}

interface SkillsShEntry {
  source: string   // "owner/repo"
  skillId: string
  name: string
  installs: number
}

const SKILLS_SH_URL = 'https://skills.sh'

/**
 * Fetches the skills.sh leaderboard and extracts the catalog from
 * the embedded Next.js RSC payload (server-rendered JSON data).
 *
 * skills.sh is a Next.js app that embeds skill data in `self.__next_f.push()` calls.
 * Each skill entry has: { source: "owner/repo", skillId: "name", name: "...", installs: N }
 */
export async function fetchSkillsShCatalog(
  limit: number = 50,
  forceRefresh: boolean = false,
  homeOverride?: string,
): Promise<SkillsShPackage[]> {
  const { readCache, writeCache } = await import('../cache/diskCache.js')
  const CACHE_KEY = `skillssh_catalog_${limit}`
  
  const registry = await readRegistry(homeOverride)
  const installedIds = new Set(Object.values(registry.mods).map(m => m.id))

  if (!forceRefresh) {
    const cached = await readCache<SkillsShPackage[]>(CACHE_KEY, homeOverride)
    if (cached) {
      // Re-map already_installed in case it changed since cache
      return cached.data.map(pkg => ({
        ...pkg,
        already_installed: installedIds.has(pkg.id)
      }))
    }
  }

  // Fetch the leaderboard page
  const res = await fetch(SKILLS_SH_URL, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml',
      'User-Agent': 'aide/1.0',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch skills.sh: ${res.status} ${res.statusText}`)
  }

  const html = await res.text()

  // Extract skill entries from the Next.js RSC payload.
  // The data is embedded as JSON arrays inside self.__next_f.push() calls.
  // Pattern: {"source":"owner/repo","skillId":"skill-name","name":"...", "installs":12345}
  const entryPattern = /\{\\?"source\\?":\\?"([^"\\]+)\\?"[,]\\?"skillId\\?":\\?"([^"\\]+)\\?"[,]\\?"name\\?":\\?"([^"\\]+)\\?"[,]\\?"installs\\?":\\?(\d+)\}/g

  const seen = new Set<string>()
  const entries: SkillsShEntry[] = []
  let match: RegExpExecArray | null

  while ((match = entryPattern.exec(html)) !== null) {
    const source = match[1]!
    const skillId = match[2]!
    const name = match[3]!
    const installs = parseInt(match[4]!, 10)

    const key = `${source}/${skillId}`
    if (seen.has(key)) continue
    seen.add(key)

    entries.push({ source, skillId, name, installs })

    if (entries.length >= limit) break
  }

  if (entries.length === 0) {
    throw new Error('Failed to parse skills.sh catalog: no entries found in page data')
  }

  // Sort by installs descending (they should already be sorted, but just in case)
  entries.sort((a, b) => b.installs - a.installs)

  // Fetch frontmatter for top skills (batch with concurrency control)
  const results: SkillsShPackage[] = []
  const CONCURRENCY = 8

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (entry) => {
        const [owner, repo] = entry.source.split('/')

        // Try common SKILL.md locations in the repo
        const possiblePaths = [
          `skills/${entry.skillId}/SKILL.md`,
          `${entry.skillId}/SKILL.md`,
          `SKILL.md`,
        ]

        let frontmatter: SkillFrontmatter | null = null
        let resolvedPath = possiblePaths[0]!

        for (const path of possiblePaths) {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`
            const mdRes = await fetch(rawUrl, {
              signal: AbortSignal.timeout(5000),
            })
            if (mdRes.ok) {
              const content = await mdRes.text()
              frontmatter = parseFrontmatter(content)
              resolvedPath = path
              break
            }
          } catch {
            // try next path
          }
        }

        const installs = entry.installs >= 1000
          ? `${(entry.installs / 1000).toFixed(1)}K`
          : String(entry.installs)

        const pkg: SkillsShPackage = {
          id: entry.skillId,
          name: frontmatter?.name ?? entry.name,
          description: frontmatter?.description ?? '',
          owner: owner!,
          repo: repo!,
          skillPath: resolvedPath,
          rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/main/${resolvedPath}`,
          pageUrl: `https://github.com/${owner}/${repo}`,
          homepageUrl: `${SKILLS_SH_URL}/${owner}/${repo}/${entry.skillId}`,
          installs,
          already_installed: installedIds.has(entry.skillId),
          frontmatter,
        }

        return pkg
      }),
    )

    results.push(...batchResults)
  }

  await writeCache(CACHE_KEY, results, homeOverride)
  return results
}


/**
 * Installs a skills.sh package into the Aide library by downloading
 * its SKILL.md from GitHub and storing it via the standard `addRemoteSkill` pipeline.
 */
export async function installSkillsShPackage(
  rawUrl: string,
  skillId: string,
  homeOverride?: string,
): Promise<{ success: boolean; error?: string }> {
  const { addRemoteSkill } = await import('./addRemoteSkill.js')

  try {
    await addRemoteSkill(rawUrl, skillId, 'skills.sh', homeOverride)
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
