import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from './ipc/channels.js'
import type {
  AddOptions,
  ApplyOptions,
  ListOptions,
  LinkOptions,
  InitResult,
  AddResult,
  RemoveResult,
  ApplyResult,
  ListResult,
  LinkResult,
  UnlinkResult,
  PropagateResult,
  Registry,
  GlobalConfig,
  DiscoverResult,
  ProjectSkillsResult,
  DisableProjectSkillResult,
  EnableProjectSkillResult,
  ImportProjectSkillResult,
  CopyProjectSkillResult,
  SkillFrontmatter,
} from '@aide/core'

type ConfigUpdates = Partial<Omit<GlobalConfig, 'version'>>

/** Safe API exposed to the renderer via contextBridge */
const aideAPI = {
  init: (): Promise<InitResult> => ipcRenderer.invoke(IPC.INIT),

  add: (options: AddOptions): Promise<AddResult> => ipcRenderer.invoke(IPC.ADD, options),

  remove: (id: string): Promise<RemoveResult> => ipcRenderer.invoke(IPC.REMOVE, id),

  apply: (options: ApplyOptions & { confirm: boolean }): Promise<ApplyResult> =>
    ipcRenderer.invoke(IPC.APPLY, options),

  list: (options: ListOptions): Promise<ListResult> => ipcRenderer.invoke(IPC.LIST, options),

  link: (options: LinkOptions): Promise<LinkResult> => ipcRenderer.invoke(IPC.LINK, options),

  unlink: (projectPath: string): Promise<UnlinkResult> => ipcRenderer.invoke(IPC.UNLINK, projectPath),

  sync: (templateName?: string): Promise<PropagateResult> => ipcRenderer.invoke(IPC.SYNC, templateName),

  readRegistry: (): Promise<Registry> => ipcRenderer.invoke(IPC.READ_REGISTRY),

  readConfig: (): Promise<GlobalConfig> => ipcRenderer.invoke(IPC.READ_CONFIG),

  updateConfig: (updates: ConfigUpdates): Promise<GlobalConfig> =>
    ipcRenderer.invoke(IPC.UPDATE_CONFIG, updates),

  discover: (): Promise<DiscoverResult> => ipcRenderer.invoke(IPC.DISCOVER),

  pickFolder: (): Promise<string | null> => ipcRenderer.invoke(IPC.PICK_FOLDER),

  listProjectSkills: (projectPath: string): Promise<ProjectSkillsResult> =>
    ipcRenderer.invoke(IPC.LIST_PROJECT_SKILLS, projectPath),

  disableProjectSkill: (projectPath: string, skillId: string): Promise<DisableProjectSkillResult> =>
    ipcRenderer.invoke(IPC.DISABLE_PROJECT_SKILL, projectPath, skillId),

  enableProjectSkill: (projectPath: string, skillId: string, targetRels?: string[]): Promise<EnableProjectSkillResult> =>
    ipcRenderer.invoke(IPC.ENABLE_PROJECT_SKILL, projectPath, skillId, targetRels),

  importProjectSkill: (projectPath: string, skillId: string): Promise<ImportProjectSkillResult> =>
    ipcRenderer.invoke(IPC.IMPORT_PROJECT_SKILL, projectPath, skillId),

  copyProjectSkill: (projectPath: string, skillId: string, targetRels?: string[]): Promise<CopyProjectSkillResult> =>
    ipcRenderer.invoke(IPC.COPY_PROJECT_SKILL, projectPath, skillId, targetRels),

  readSkillFrontmatter: (filePath: string): Promise<SkillFrontmatter | null> =>
    ipcRenderer.invoke(IPC.READ_SKILL_FRONTMATTER, filePath),

  isInitialized: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC.IS_INITIALIZED),
}

contextBridge.exposeInMainWorld('aide', aideAPI)

export type AideAPI = typeof aideAPI
