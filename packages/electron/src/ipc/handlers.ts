import { ipcMain } from 'electron'
import {
  init,
  add,
  remove,
  apply,
  writeApplyResult,
  list,
  link,
  unlink,
  propagate,
  readRegistry,
  readConfig,
  discover,
} from '@aide/core'
import { IPC } from './channels.js'
import type { AddOptions, ApplyOptions, ListOptions, LinkOptions } from '@aide/core'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.INIT, async () => {
    return init()
  })

  ipcMain.handle(IPC.ADD, async (_event, options: AddOptions) => {
    return add(options)
  })

  ipcMain.handle(IPC.REMOVE, async (_event, id: string) => {
    return remove({ id })
  })

  ipcMain.handle(IPC.APPLY, async (_event, options: ApplyOptions & { confirm: boolean }) => {
    const result = await apply(options)
    if (!result.requires_confirmation || options.confirm) {
      await writeApplyResult(result)
    }
    return result
  })

  ipcMain.handle(IPC.LIST, async (_event, options: ListOptions) => {
    return list(options)
  })

  ipcMain.handle(IPC.LINK, async (_event, options: LinkOptions) => {
    return link(options)
  })

  ipcMain.handle(IPC.UNLINK, async (_event, projectPath: string) => {
    return unlink(projectPath)
  })

  ipcMain.handle(IPC.SYNC, async (_event, templateName?: string) => {
    return propagate({ templateName })
  })

  ipcMain.handle(IPC.READ_REGISTRY, async () => {
    return readRegistry()
  })

  ipcMain.handle(IPC.READ_CONFIG, async () => {
    return readConfig()
  })

  ipcMain.handle(IPC.DISCOVER, async () => {
    return discover()
  })
}
