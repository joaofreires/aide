export interface LinkOptions {
  projectPath: string
  variables?: Record<string, string>
  homeOverride?: string
}

export interface LinkResult {
  projectPath: string
  variables: Record<string, string>
  already_linked: boolean
}

export interface UnlinkResult {
  projectPath: string
}
