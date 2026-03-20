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
} from '@aide/core'

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

  discover: (): Promise<DiscoverResult> => ipcRenderer.invoke(IPC.DISCOVER),
}

contextBridge.exposeInMainWorld('aide', aideAPI)

export type AideAPI = typeof aideAPI
