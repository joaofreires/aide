import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { ensureAideDir } from '../fs/aideDir.js'
import { addMod as addModToRegistry } from '../registry/registry.js'
import type { AddResult } from './add.js'
import type { InstalledMod } from '../registry/schema.js'

export async function addRemoteSkill(
  rawUrl: string,
  skillId: string,
  _repo: string,
  homeOverride?: string,
): Promise<AddResult> {
  const res = await fetch(rawUrl)
  if (!res.ok) throw new Error(`Failed to fetch skill: ${res.status} ${res.statusText}`)
  const content = await res.text()

  const paths = await ensureAideDir(homeOverride)
  const destination = join(paths.skills, `${skillId}.md`)

  await writeFile(destination, content, 'utf8')

  const checksum = 'sha256:' + createHash('sha256').update(content).digest('hex')

  const mod: InstalledMod = {
    id: skillId,
    type: 'skill',
    source: 'url',
    source_url: rawUrl,
    installed_at: new Date().toISOString(),
    version: '1.0.0',
    path: destination,
    checksum,
    executable: true,
  }

  await addModToRegistry(mod, homeOverride)

  return { mod, destination }
}
