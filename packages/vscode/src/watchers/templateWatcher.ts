import * as vscode from 'vscode'
import chokidar, { type FSWatcher } from 'chokidar'
import { getAidePaths, propagate } from '@aide/core'
import { basename } from 'node:path'

export class TemplateWatcher {
  private watcher: FSWatcher | null = null

  start(): void {
    const paths = getAidePaths()
    this.watcher = chokidar.watch(paths.templates, {
      persistent: true,
      ignoreInitial: true,
    })

    this.watcher.on('change', (filePath: string) => {
      const templateName = basename(filePath)
      this.handleTemplateChange(templateName)
    })

    this.watcher.on('add', (filePath: string) => {
      const templateName = basename(filePath)
      this.handleTemplateChange(templateName)
    })
  }

  private async handleTemplateChange(templateName: string): Promise<void> {
    try {
      const result = await propagate({ templateName })
      const changed = result.propagated.filter((p) => p.action !== 'skipped')

      if (changed.length > 0) {
        void vscode.window.showInformationMessage(
          `Aide: synced "${templateName}" to ${changed.length} linked project(s).`,
        )
      }
    } catch (err) {
      void vscode.window.showWarningMessage(`Aide: failed to propagate "${templateName}": ${String(err)}`)
    }
  }

  dispose(): void {
    void this.watcher?.close()
    this.watcher = null
  }
}
