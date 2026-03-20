import { describe, it, expect } from 'vitest'
import { merge } from '../../src/conflict/merger.js'
import { wrapInTags } from '../../src/conflict/tags.js'

const TEMPLATE_ID = 'CLAUDE.md'
const RENDERED = '# Hello World\n\nThis is test content.'

describe('merger - 4 cases', () => {
  it('case 1: file does not exist → creates with AIDE tags', () => {
    const result = merge({ existing: null, rendered: RENDERED, templateId: TEMPLATE_ID })

    expect(result.action).toBe('created')
    expect(result.requires_confirmation).toBe(false)
    expect(result.content).toContain(`<!-- AIDE:START id="${TEMPLATE_ID}"`)
    expect(result.content).toContain(`<!-- AIDE:END id="${TEMPLATE_ID}" -->`)
    expect(result.content).toContain(RENDERED)
  })

  it('case 1: empty string also creates', () => {
    const result = merge({ existing: '', rendered: RENDERED, templateId: TEMPLATE_ID })

    expect(result.action).toBe('created')
    expect(result.requires_confirmation).toBe(false)
  })

  it('case 2: file exists with no AIDE tags → appends, requires confirmation', () => {
    const existing = '# My existing content\n\nSome user notes.'
    const result = merge({ existing, rendered: RENDERED, templateId: TEMPLATE_ID })

    expect(result.action).toBe('appended')
    expect(result.requires_confirmation).toBe(true)
    expect(result.content).toContain('# My existing content')
    expect(result.content).toContain(`<!-- AIDE:START id="${TEMPLATE_ID}"`)
    expect(result.conflict_diff).toBeDefined()
  })

  it('case 3: file has matching AIDE tags → replaces in place', () => {
    const oldContent = '# Old content'
    const existing = `# User preamble\n\n${wrapInTags(TEMPLATE_ID, oldContent)}\n\n# User epilogue`
    const result = merge({ existing, rendered: RENDERED, templateId: TEMPLATE_ID })

    expect(result.action).toBe('merged')
    expect(result.requires_confirmation).toBe(false)
    expect(result.content).toContain('# User preamble')
    expect(result.content).toContain('# User epilogue')
    expect(result.content).toContain(RENDERED)
    expect(result.conflict_diff).toBeDefined()
  })

  it('case 3: no change when content is identical → skipped', () => {
    const existing = wrapInTags(TEMPLATE_ID, RENDERED)
    const result = merge({ existing, rendered: RENDERED, templateId: TEMPLATE_ID })

    expect(result.action).toBe('skipped')
    expect(result.requires_confirmation).toBe(false)
    expect(result.content).toBe(existing)
  })

  it('case 4: file has AIDE tags for different template → appends new section', () => {
    const existing = `${wrapInTags('AGENTS.md', 'agents content')}\n`
    const result = merge({ existing, rendered: RENDERED, templateId: TEMPLATE_ID })

    expect(result.action).toBe('appended')
    expect(result.requires_confirmation).toBe(false)
    expect(result.content).toContain(`<!-- AIDE:START id="AGENTS.md"`)
    expect(result.content).toContain(`<!-- AIDE:START id="${TEMPLATE_ID}"`)
  })

  it('preserves user content outside AIDE tags when replacing', () => {
    const userAbove = '# My project\n\nUser notes above.'
    const userBelow = '\n\n## My own section\n\nUser content below.'
    const existing = `${userAbove}\n\n${wrapInTags(TEMPLATE_ID, 'old content')}${userBelow}`

    const result = merge({ existing, rendered: RENDERED, templateId: TEMPLATE_ID })

    expect(result.content).toContain(userAbove)
    expect(result.content).toContain(userBelow)
    expect(result.content).toContain(RENDERED)
  })
})
