import * as vscode from 'vscode'
import { ModsTreeProvider } from './views/modsTreeProvider.js'
import { TemplateWatcher } from './watchers/templateWatcher.js'
import { applyTemplateCommand } from './commands/applyTemplate.js'
import { addModCommand } from './commands/addMod.js'
import { propagate, link, unlink } from '@aide/core'

let templateWatcher: TemplateWatcher | null = null

export function activate(context: vscode.ExtensionContext): void {
  // Tree view
  const modsProvider = new ModsTreeProvider()
  const treeView = vscode.window.createTreeView('aideModsView', {
    treeDataProvider: modsProvider,
    showCollapseAll: false,
  })

  // Template file watcher
  templateWatcher = new TemplateWatcher()
  templateWatcher.start()

  // Register commands
  context.subscriptions.push(
    treeView,

    vscode.commands.registerCommand('aide.apply', applyTemplateCommand),

    vscode.commands.registerCommand('aide.addMod', addModCommand),

    vscode.commands.registerCommand('aide.listMods', () => {
      modsProvider.refresh()
      void vscode.commands.executeCommand('aideModsView.focus')
    }),

    vscode.commands.registerCommand('aide.sync', async () => {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Aide: Syncing templates...', cancellable: false },
        async () => {
          try {
            const result = await propagate()
            const changed = result.propagated.filter((p) => p.action !== 'skipped')
            if (changed.length > 0) {
              void vscode.window.showInformationMessage(`Aide: synced ${changed.length} file(s).`)
            } else {
              void vscode.window.showInformationMessage('Aide: everything up to date.')
            }
          } catch (err) {
            void vscode.window.showErrorMessage(`Aide: sync failed: ${String(err)}`)
          }
        },
      )
    }),

    vscode.commands.registerCommand('aide.linkWorkspace', async () => {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      if (!workspacePath) {
        void vscode.window.showErrorMessage('Aide: No workspace folder open.')
        return
      }
      try {
        await link({ projectPath: workspacePath })
        void vscode.window.showInformationMessage(`Aide: linked ${workspacePath}`)
      } catch (err) {
        void vscode.window.showErrorMessage(`Aide: link failed: ${String(err)}`)
      }
    }),

    vscode.commands.registerCommand('aide.unlinkWorkspace', async () => {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      if (!workspacePath) {
        void vscode.window.showErrorMessage('Aide: No workspace folder open.')
        return
      }
      try {
        await unlink(workspacePath)
        void vscode.window.showInformationMessage(`Aide: unlinked ${workspacePath}`)
      } catch (err) {
        void vscode.window.showErrorMessage(`Aide: unlink failed: ${String(err)}`)
      }
    }),
  )
}

export function deactivate(): void {
  templateWatcher?.dispose()
  templateWatcher = null
}
