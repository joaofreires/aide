// Errors
export * from './errors/AideError.js'

// FS utilities
export { getAidePaths, ensureAideDir, isAideDirInitialized } from './fs/aideDir.js'
export { assertExecutable, isReadable, isWritable } from './fs/permissions.js'
export type { AidePaths } from './fs/aideDir.js'

// Config
export { readConfig, writeConfig, updateConfig } from './config/config.js'
export { GlobalConfigSchema, DEFAULT_CONFIG } from './config/schema.js'
export type { GlobalConfig } from './config/schema.js'

// Registry
export {
  readRegistry,
  writeRegistry,
  getMod,
  addMod,
  removeMod,
  linkProject,
  unlinkProject,
  getLinkedProject,
} from './registry/registry.js'
export {
  RegistrySchema,
  InstalledModSchema,
  LinkedProjectSchema,
  DEFAULT_REGISTRY,
} from './registry/schema.js'
export type {
  Registry,
  InstalledMod,
  LinkedProject,
  ModType,
  ModSource,
} from './registry/schema.js'

// Templates
export { renderTemplate, mergeVariables } from './templates/engine.js'
export { resolveBuiltinVariables } from './templates/variables.js'
export { DEFAULT_TEMPLATES } from './templates/defaults.js'

// Conflict resolution
export { merge } from './conflict/merger.js'
export { findAideSections, wrapInTags, makeStartTag, makeEndTag } from './conflict/tags.js'
export { simpleDiff } from './conflict/diff.js'
export type { MergeResult, MergeAction } from './conflict/merger.js'

// Mods
export { loadModFiles, readModContent } from './mods/loader.js'
export { validateModFile, assertValidMod } from './mods/validator.js'

// Operations
export { init } from './operations/init.js'
export { apply, writeApplyResult } from './operations/apply.js'
export { add } from './operations/add.js'
export { remove } from './operations/remove.js'
export { list } from './operations/list.js'
export { discover } from './operations/discover.js'
export type { InitResult } from './operations/init.js'
export type { ApplyOptions, ApplyResult } from './operations/apply.js'
export type { AddOptions, AddResult } from './operations/add.js'
export type { RemoveOptions, RemoveResult } from './operations/remove.js'
export type { ListOptions, ListResult } from './operations/list.js'
export type { DiscoverResult, DiscoveredFile } from './operations/discover.js'

// Linking
export { link, unlink } from './linking/linker.js'
export { propagate } from './linking/propagator.js'
export type { LinkOptions, LinkResult, UnlinkResult } from './linking/types.js'
export type { PropagateOptions, PropagateResult } from './linking/propagator.js'
