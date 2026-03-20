import * as vscode from 'vscode'
import * as path from 'node:path'
import { apply, writeApplyResult, getAidePaths } from '@aide/core'
import { readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'

export async function applyTemplateCommand(): Promise<void> {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspacePath) {
    void vscode.window.showErrorMessage('Aide: No workspace folder open.')
    return
  }

  // List available templates
  const paths = getAidePaths()
  let templates: string[] = []
  if (existsSync(paths.templates)) {
    try {
      const entries = await readdir(paths.templates)
      templates = entries
    } catch {
      // fall through to default
    }
  }

  if (templates.length === 0) {
    void vscode.window.showErrorMessage(
      'Aide: No templates found in ~/.aide/templates/. Run `aide init` first.',
    )
    return
  }

  const selected = await vscode.window.showQuickPick(templates, {
    placeHolder: 'Select a template to apply',
  })

  if (!selected) return

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Applying ${selected}...`, cancellable: false },
    async () => {
      try {
        const result = await apply({ templateName: selected, projectPath: workspacePath })

        if (result.requires_confirmation) {
          const choice = await vscode.window.showInformationMessage(
            `Aide: "${selected}" already exists in this workspace. Append managed section?`,
            'Yes',
            'No',
          )
          if (choice !== 'Yes') return
        }

        await writeApplyResult(result)
        void vscode.window.showInformationMessage(
          `Aide: ${result.action} ${path.basename(result.file)}`,
        )
      } catch (err) {
        void vscode.window.showErrorMessage(`Aide: Failed to apply template: ${String(err)}`)
      }
    },
  )
}
