export type ModType = 'agent' | 'skill' | 'template'

export interface ModManifest {
  id: string
  name: string
  description?: string
  type: ModType
  version: string
  author?: string
  tags?: string[]
}
