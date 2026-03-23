import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
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
  updateConfig,
  discover,
  listProjectSkills,
  disableProjectSkill,
  enableProjectSkill,
  importProjectSkill,
  copyProjectSkillToRels,
  readSkillFrontmatter,
  isAideDirInitialized,
  listRemoteSkills,
  addRemoteSkill,
} from '@aide/core'
import type { GlobalConfig } from '@aide/core'
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
    return propagate(templateName !== undefined ? { templateName } : {})
  })

  ipcMain.handle(IPC.READ_REGISTRY, async () => {
    return readRegistry()
  })

  ipcMain.handle(IPC.READ_CONFIG, async () => {
    return readConfig()
  })

  ipcMain.handle(IPC.UPDATE_CONFIG, async (_event, updates: Partial<Omit<GlobalConfig, 'version'>>) => {
    return updateConfig(updates)
  })

  ipcMain.handle(IPC.DISCOVER, async () => {
    return discover()
  })

  ipcMain.handle(IPC.PICK_FOLDER, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win ?? BrowserWindow.getFocusedWindow()!, {
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.LIST_PROJECT_SKILLS, async (_event, projectPath: string) => {
    return listProjectSkills(projectPath)
  })

  ipcMain.handle(IPC.DISABLE_PROJECT_SKILL, async (_event, projectPath: string, skillId: string) => {
    return disableProjectSkill(projectPath, skillId)
  })

  ipcMain.handle(IPC.ENABLE_PROJECT_SKILL, async (_event, projectPath: string, skillId: string, targetRels?: string[]) => {
    return enableProjectSkill(projectPath, skillId, undefined, targetRels)
  })

  ipcMain.handle(IPC.IMPORT_PROJECT_SKILL, async (_event, projectPath: string, skillId: string) => {
    return importProjectSkill(projectPath, skillId)
  })

  ipcMain.handle(IPC.COPY_PROJECT_SKILL, async (_event, projectPath: string, skillId: string, targetRels?: string[]) => {
    return copyProjectSkillToRels(projectPath, skillId, targetRels)
  })

  ipcMain.handle(IPC.READ_SKILL_FRONTMATTER, async (_event, filePath: string) => {
    return readSkillFrontmatter(filePath)
  })

  ipcMain.handle(IPC.IS_INITIALIZED, async () => {
    return isAideDirInitialized()
  })

  ipcMain.handle(IPC.LIST_REMOTE_SKILLS, async () => {
    return listRemoteSkills()
  })

  ipcMain.handle(IPC.ADD_REMOTE_SKILL, async (_event, rawUrl: string, skillId: string, repo: string) => {
    return addRemoteSkill(rawUrl, skillId, repo)
  })

  ipcMain.handle(IPC.OPEN_EXTERNAL, async (_event, url: string) => {
    await shell.openExternal(url)
  })
}
