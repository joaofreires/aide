import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'

const CACHE_DIR_NAME = 'cache'

function getCacheDir(homeOverride?: string): string {
  const home = homeOverride ?? homedir()
  return join(home, '.aide', CACHE_DIR_NAME)
}

function getCachePath(key: string, homeOverride?: string): string {
  // Sanitise key to a safe filename
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return join(getCacheDir(homeOverride), `${safe}.json`)
}

export interface CacheEntry<T> {
  data: T
  fetchedAt: string  // ISO timestamp
}

/**
 * Read a cached value from disk.
 * Returns null if no cache exists.
 */
export async function readCache<T>(key: string, homeOverride?: string): Promise<CacheEntry<T> | null> {
  const path = getCachePath(key, homeOverride)
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as CacheEntry<T>
  } catch {
    return null
  }
}

/**
 * Write a value to the disk cache.
 */
export async function writeCache<T>(key: string, data: T, homeOverride?: string): Promise<void> {
  const dir = getCacheDir(homeOverride)
  await mkdir(dir, { recursive: true })
  const path = getCachePath(key, homeOverride)
  const entry: CacheEntry<T> = {
    data,
    fetchedAt: new Date().toISOString(),
  }
  await writeFile(path, JSON.stringify(entry, null, 2), 'utf-8')
}

/**
 * Returns a human-readable "time ago" string for a cache entry.
 */
export function cacheAge(fetchedAt: string): string {
  const ms = Date.now() - new Date(fetchedAt).getTime()
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
