import { readConfig } from '../config/config.js'
import { readRegistry } from '../registry/registry.js'

export interface MarketplaceSkill {
  id: string
  name: string
  description: string
  version: string
  download_url: string
  author: string
  tags: string[]
  already_installed: boolean
}

interface MarketplaceResponse {
  skills: Array<{
    id: string
    name: string
    description: string
    version: string
    download_url: string
    author?: string
    tags?: string[]
  }>
}

/**
 * Fetches the community skill catalog from the configured registry_url.
 * Expected API response: { skills: [{ id, name, description, version, download_url, author?, tags? }] }
 */
export async function listMarketplaceSkills(
  forceRefresh: boolean = false,
  homeOverride?: string
): Promise<MarketplaceSkill[]> {
  const { readCache, writeCache } = await import('../cache/diskCache.js')
  const CACHE_KEY = 'marketplace_catalog'

  const config = await readConfig(homeOverride)

  if (!config.registry_url) {
    return []
  }

  const registry = await readRegistry(homeOverride)
  const installedIds = new Set(Object.values(registry.mods).map(m => m.id))

  if (!forceRefresh) {
    const cached = await readCache<MarketplaceSkill[]>(CACHE_KEY, homeOverride)
    if (cached) {
      return cached.data.map(pkg => ({
        ...pkg,
        already_installed: installedIds.has(pkg.id)
      }))
    }
  }

  const url = config.registry_url.replace(/\/$/, '') + '/skills'
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Marketplace fetch failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json() as MarketplaceResponse

  if (!data.skills || !Array.isArray(data.skills)) {
    return []
  }

  const results = data.skills.map(s => ({
    id: s.id,
    name: s.name || s.id,
    description: s.description || '',
    version: s.version || '0.0.0',
    download_url: s.download_url,
    author: s.author ?? 'unknown',
    tags: s.tags ?? [],
    already_installed: installedIds.has(s.id),
  }))

  await writeCache(CACHE_KEY, results, homeOverride)
  return results
}
