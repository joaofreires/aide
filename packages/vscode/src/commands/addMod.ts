import * as vscode from 'vscode'
import { add } from '@aide/core'
import type { ModType } from '@aide/core'

export async function addModCommand(): Promise<void> {
  const fileUri = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: 'Add Mod',
    title: 'Select a mod file to add',
  })

  if (!fileUri || fileUri.length === 0 || !fileUri[0]) return

  const filePath = fileUri[0].fsPath

  const type = await vscode.window.showQuickPick(
    [
      { label: 'Agent', description: 'System prompt or persona (Markdown/JSON)', value: 'agent' as ModType },
      { label: 'Skill', description: 'Executable script or tool definition', value: 'skill' as ModType },
      { label: 'Template', description: 'Context template (CLAUDE.md, AGENTS.md, etc.)', value: 'template' as ModType },
    ],
    { placeHolder: 'What type of mod is this?' },
  )

  if (!type) return

  try {
    const result = await add({ filePath, type: type.value })
    void vscode.window.showInformationMessage(`Aide: Added ${result.mod.type} "${result.mod.id}"`)
  } catch (err) {
    void vscode.window.showErrorMessage(`Aide: Failed to add mod: ${String(err)}`)
  }
}
