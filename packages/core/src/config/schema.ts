import { z } from 'zod'

export const GlobalConfigSchema = z.object({
  version: z.literal('1'),
  auto_propagate: z.boolean().default(true),
  confirm_before_write: z.boolean().default(true),
  default_variables: z.record(z.string()).default({}),
  skill_allow_list: z.array(z.string()).default([]),
  registry_url: z.string().url().nullable().default(null),
})

export type GlobalConfig = z.infer<typeof GlobalConfigSchema>

export const DEFAULT_CONFIG: GlobalConfig = {
  version: '1',
  auto_propagate: true,
  confirm_before_write: true,
  default_variables: {},
  skill_allow_list: [],
  registry_url: null,
}
