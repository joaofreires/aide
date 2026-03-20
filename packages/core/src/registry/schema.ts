import { z } from 'zod'

export const ModTypeSchema = z.enum(['agent', 'skill', 'template'])
export type ModType = z.infer<typeof ModTypeSchema>

export const ModSourceSchema = z.enum(['local', 'url', 'registry'])
export type ModSource = z.infer<typeof ModSourceSchema>

export const InstalledModSchema = z.object({
  id: z.string().min(1),
  type: ModTypeSchema,
  source: ModSourceSchema,
  source_url: z.string().url().nullable(),
  installed_at: z.string().datetime(),
  version: z.string(),
  path: z.string(),
  checksum: z.string().nullable(),
  executable: z.boolean().optional(),
})
export type InstalledMod = z.infer<typeof InstalledModSchema>

export const LinkedProjectSchema = z.object({
  project_path: z.string(),
  linked_at: z.string().datetime(),
  applied_templates: z.array(z.string()),
  variables: z.record(z.string()),
})
export type LinkedProject = z.infer<typeof LinkedProjectSchema>

export const RegistrySchema = z.object({
  version: z.literal('1'),
  mods: z.record(InstalledModSchema),
  linked_projects: z.record(LinkedProjectSchema),
})
export type Registry = z.infer<typeof RegistrySchema>

export const DEFAULT_REGISTRY: Registry = {
  version: '1',
  mods: {},
  linked_projects: {},
}
