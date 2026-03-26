// Errors
export * from './errors/AideError.js'

// FS utilities
export {
  getAidePaths,
  ensureAideDir,
  isAideDirInitialized,
  getProjectArchivePaths,
  ensureProjectArchiveDir,
  getGlobalSkillArchivePaths,
  ensureGlobalSkillArchiveDir,
} from './fs/aideDir.js'
export { assertExecutable, isReadable, isWritable } from './fs/permissions.js'
export type { AidePaths, ProjectArchivePaths, GlobalSkillArchivePaths } from './fs/aideDir.js'

// Config
export { readConfig, writeConfig, updateConfig } from './config/config.js'
export { GlobalConfigSchema, DEFAULT_CONFIG } from './config/schema.js'
export type { GlobalConfig, TypedDir, ScanRoot, SkillRepository } from './config/schema.js'

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
export { discover, listTypedEntries } from './operations/discover.js'
export { listProjectSkills } from './operations/listProjectSkills.js'
export { disableProjectSkill } from './operations/disableProjectSkill.js'
export { enableProjectSkill } from './operations/enableProjectSkill.js'
export { importProjectSkill } from './operations/importProjectSkill.js'
export { copyProjectSkillToRels } from './operations/copyProjectSkillToRels.js'
export { readSkillFrontmatter } from './operations/readSkillFrontmatter.js'
export { listRemoteSkills } from './operations/listRemoteSkills.js'
export { addRemoteSkill } from './operations/addRemoteSkill.js'
export type { InitResult } from './operations/init.js'
export type { ApplyOptions, ApplyResult } from './operations/apply.js'
export type { AddOptions, AddResult } from './operations/add.js'
export type { RemoveOptions, RemoveResult } from './operations/remove.js'
export type { ListOptions, ListResult } from './operations/list.js'
export type { DiscoverResult, DiscoveredFile } from './operations/discover.js'
export type {
  ProjectSkillStatus, ProjectSkill, ProjectSkillsResult, ArchivedSkillMeta,
} from './operations/listProjectSkills.js'
export type { SkillFrontmatter } from './skills/frontmatter.js'
export type { DisableProjectSkillResult } from './operations/disableProjectSkill.js'
export type { EnableProjectSkillResult } from './operations/enableProjectSkill.js'
export type { ImportProjectSkillResult } from './operations/importProjectSkill.js'
export type { CopyProjectSkillResult } from './operations/copyProjectSkillToRels.js'
export type { RemoteSkill } from './operations/listRemoteSkills.js'

// Linking
export { link, unlink } from './linking/linker.js'
export { propagate } from './linking/propagator.js'
export type { LinkOptions, LinkResult, UnlinkResult } from './linking/types.js'
export type { PropagateOptions, PropagateResult } from './linking/propagator.js'
