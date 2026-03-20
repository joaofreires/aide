import * as vscode from 'vscode'
import { readRegistry } from '@aide/core'
import type { InstalledMod } from '@aide/core'

export class ModsTreeProvider implements vscode.TreeDataProvider<ModItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ModItem | undefined | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: ModItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: ModItem): Promise<ModItem[]> {
    if (element) return []

    try {
      const registry = await readRegistry()
      const mods = Object.values(registry.mods)

      if (mods.length === 0) {
        return [new ModItem('No mods installed', 'agent', vscode.TreeItemCollapsibleState.None, true)]
      }

      return mods.map(
        (mod) => new ModItem(mod.id, mod.type, vscode.TreeItemCollapsibleState.None, false, mod),
      )
    } catch {
      return [new ModItem('Failed to load mods', 'agent', vscode.TreeItemCollapsibleState.None, true)]
    }
  }
}

class ModItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly modType: InstalledMod['type'],
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isPlaceholder = false,
    public readonly mod?: InstalledMod,
  ) {
    super(label, collapsibleState)

    if (!isPlaceholder && mod) {
      this.description = `${mod.type} v${mod.version}`
      this.tooltip = `${mod.type}: ${mod.id}\nVersion: ${mod.version}\nSource: ${mod.source}\nPath: ${mod.path}`
      this.iconPath = new vscode.ThemeIcon(
        mod.type === 'agent' ? 'robot' : mod.type === 'skill' ? 'tools' : 'file-text',
      )
    } else {
      this.iconPath = new vscode.ThemeIcon('info')
    }
  }
}
