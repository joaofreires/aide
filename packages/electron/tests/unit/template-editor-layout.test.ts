import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testDir = dirname(fileURLToPath(import.meta.url))
const componentSource = readFileSync(
  resolve(testDir, '../../src/renderer/components/TemplateEditorPage.tsx'),
  'utf8'
)
const stylesSource = readFileSync(
  resolve(testDir, '../../src/renderer/styles.css'),
  'utf8'
)

function getRuleBody(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = stylesSource.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))

  expect(match?.[1], `Missing CSS rule for ${selector}`).toBeTruthy()

  return match![1]
}

describe('template editor layout', () => {
  it('renders the editor inside a dedicated workspace shell', () => {
    expect(componentSource).toContain('className="editor-workspace"')

    const workspaceRule = getRuleBody('.editor-workspace')

    expect(workspaceRule).toContain('display: flex')
    expect(workspaceRule).toContain('flex: 1')
    expect(workspaceRule).toContain('min-height: 0')
  })

  it('stretches the textarea to fill the workspace height', () => {
    const textareaRule = getRuleBody('.editor-textarea')

    expect(textareaRule).toContain('height: 100%')
    expect(textareaRule).toContain('min-height: 0')
  })
})
