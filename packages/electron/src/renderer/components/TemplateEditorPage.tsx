import { useState, useEffect, useRef, useCallback } from 'react'
import type { InstalledMod, GlobalConfig } from '@aide/core'
import { useToast } from '../hooks/useToast.js'

// Built-in variables that are always available
const BUILTIN_VARS = ['project_name', 'date', 'aide_version', 'tech_stack']

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g) ?? []
  const vars = matches.map(m => m.slice(2, -2).trim())
  return [...new Set(vars)]
}

export function TemplateEditorPage() {
  const { toast } = useToast()
  const [mods, setMods] = useState<InstalledMod[]>([])
  const [config, setConfig] = useState<GlobalConfig | null>(null)
  const [selectedMod, setSelectedMod] = useState<InstalledMod | null>(null)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [autocompleteItems, setAutocompleteItems] = useState<{ name: string; source: string }[]>([])
  const [autocompleteIdx, setAutocompleteIdx] = useState(0)
  const [autocompletePos, setAutocompletePos] = useState({ top: 0, left: 0 })

  const isDirty = content !== originalContent
  const variables = extractVariables(content)

  // Load templates list + config
  useEffect(() => {
    async function load() {
      try {
        const [registry, cfg] = await Promise.all([
          window.aide.readRegistry(),
          window.aide.readConfig(),
        ])
        const templates = Object.values(registry.mods).filter(
          m => m.type === 'template' || m.type === 'skill'
        )
        setMods(templates)
        setConfig(cfg)
      } catch (err) {
        toast(`Failed to load: ${err}`, 'error')
      }
    }
    void load()
  }, [])

  // Load selected file content
  const loadContent = useCallback(async (mod: InstalledMod) => {
    setLoading(true)
    try {
      const text = await window.aide.readModContent(mod.path)
      setContent(text)
      setOriginalContent(text)
      setSelectedMod(mod)
    } catch (err) {
      toast(`Failed to read file: ${err}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Save content
  async function handleSave() {
    if (!selectedMod || !isDirty) return
    setSaving(true)
    try {
      await window.aide.writeModContent(selectedMod.path, content)
      setOriginalContent(content)
      toast('Saved successfully', 'success')
    } catch (err) {
      toast(`Failed to save: ${err}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Build autocomplete items from builtins + config defaults
  function getKnownVariables(): { name: string; source: string }[] {
    const items: { name: string; source: string }[] = BUILTIN_VARS.map(v => ({
      name: v,
      source: 'builtin',
    }))
    if (config?.default_variables) {
      for (const key of Object.keys(config.default_variables)) {
        if (!BUILTIN_VARS.includes(key)) {
          items.push({ name: key, source: 'default' })
        }
      }
    }
    return items
  }

  // Handle autocomplete trigger
  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setContent(value)

    const cursorPos = e.target.selectionStart
    const textBefore = value.slice(0, cursorPos)
    const match = textBefore.match(/\{\{([a-zA-Z_]*)$/)

    if (match) {
      const filter = match[1]!.toLowerCase()
      const allVars = getKnownVariables()
      const filtered = filter
        ? allVars.filter(v => v.name.toLowerCase().includes(filter))
        : allVars

      if (filtered.length > 0) {
        setAutocompleteItems(filtered)
        setAutocompleteIdx(0)
        setShowAutocomplete(true)

        // Position autocomplete near cursor (approximate)
        const textarea = textareaRef.current
        if (textarea) {
          const linesBefore = textBefore.split('\n')
          const lineNum = linesBefore.length
          const colNum = linesBefore[linesBefore.length - 1]!.length
          setAutocompletePos({
            top: lineNum * 22 + 40,
            left: Math.min(colNum * 7.8 + 24, textarea.clientWidth - 220),
          })
        }
        return
      }
    }

    setShowAutocomplete(false)
  }

  function insertAutocomplete(varName: string) {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const before = content.slice(0, cursorPos)
    const after = content.slice(cursorPos)

    // Find the partial {{... we need to complete
    const match = before.match(/\{\{([a-zA-Z_]*)$/)
    if (!match) return

    const start = cursorPos - match[0].length
    const newContent = content.slice(0, start) + `{{${varName}}}` + after
    setContent(newContent)
    setShowAutocomplete(false)

    // Restore focus and cursor
    setTimeout(() => {
      const newPos = start + varName.length + 4 // {{name}}
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!showAutocomplete) {
      // Save shortcut
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSave()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAutocompleteIdx(i => Math.min(i + 1, autocompleteItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAutocompleteIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const item = autocompleteItems[autocompleteIdx]
      if (item) insertAutocomplete(item.name)
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false)
    }
  }

  return (
    <div className="page active" style={{ display: 'flex' }}>
      <div className="page-header">
        <div className="page-title">Template Editor</div>
        <div className="page-desc">Edit markdown templates with variable completion</div>
      </div>
      <div className="editor-layout">
        {/* File list */}
        <div className="editor-file-list">
          {mods.length === 0 ? (
            <div className="empty" style={{ padding: '20px 14px', fontSize: '12px' }}>
              <span className="empty-icon">📄</span>
              No templates or skills found.
            </div>
          ) : (
            mods.map(mod => (
              <button
                key={mod.id}
                className={`editor-file-item${selectedMod?.id === mod.id ? ' active' : ''}`}
                onClick={() => { void loadContent(mod) }}
              >
                <span className="editor-file-icon">
                  {mod.type === 'template' ? '📄' : '⚡'}
                </span>
                <span className="editor-file-name">{mod.id}</span>
              </button>
            ))
          )}
        </div>

        {/* Editor area */}
        <div className="editor-main">
          {selectedMod ? (
            <>
              <div className="editor-toolbar">
                <div className="editor-toolbar-left">
                  <span>{selectedMod.id}</span>
                  {isDirty && <span className="editor-dirty-indicator" />}
                  {isDirty && <span style={{ fontSize: '11px', color: 'var(--accent)' }}>Modified</span>}
                </div>
                <div className="editor-toolbar-right">
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={!isDirty}
                    onClick={() => { setContent(originalContent) }}
                  >
                    Revert
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!isDirty || saving}
                    onClick={() => { void handleSave() }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="editor-workspace">
                {loading ? (
                  <div className="editor-empty">
                    <span className="empty-icon">⏳</span>Loading…
                  </div>
                ) : (
                  <>
                    <textarea
                      ref={textareaRef}
                      className="editor-textarea"
                      value={content}
                      onChange={handleTextChange}
                      onKeyDown={handleKeyDown}
                      spellCheck={false}
                      placeholder="Start typing your template…"
                    />

                    {/* Autocomplete dropdown */}
                    <div
                      className={`editor-autocomplete${showAutocomplete ? ' open' : ''}`}
                      style={{ top: autocompletePos.top, left: autocompletePos.left }}
                    >
                      {autocompleteItems.map((item, i) => (
                        <button
                          key={item.name}
                          className={`editor-autocomplete-item${i === autocompleteIdx ? ' selected' : ''}`}
                          onMouseDown={e => { e.preventDefault(); insertAutocomplete(item.name) }}
                        >
                          <span className="editor-autocomplete-var">{`{{${item.name}}}`}</span>
                          <span className="editor-autocomplete-source">{item.source}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="editor-statusbar">
                <span>{selectedMod.path}</span>
                <span style={{ marginLeft: 'auto' }}>
                  <span className="editor-var-count">
                    Variables:{' '}
                    {variables.length > 0 ? (
                      variables.map(v => (
                        <span key={v} className="editor-var-badge">{v}</span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>none</span>
                    )}
                  </span>
                </span>
              </div>
            </>
          ) : (
            <div className="editor-empty">
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '32px' }}>📝</span>
                Select a file from the sidebar to start editing
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
