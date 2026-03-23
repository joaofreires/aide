import { useState, useEffect } from 'react'
import type { InstalledMod } from '@aide/core'
import type { SkillFrontmatter } from '@aide/core'
import { useToast } from '../hooks/useToast.js'
import { SkillDetail } from './shared/SkillDetail.js'

interface ModWithFrontmatter {
  mod: InstalledMod
  frontmatter: SkillFrontmatter | null
}

export function ModsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ModWithFrontmatter[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  async function load() {
    setItems(null)
    setError(null)
    try {
      const registry = await window.aide.readRegistry()
      const mods = Object.values(registry.mods)
      const frontmatters = await Promise.all(
        mods.map(mod =>
          mod.type === 'skill' ? window.aide.readSkillFrontmatter(mod.path) : Promise.resolve(null),
        ),
      )
      setItems(mods.map((mod, i) => ({ mod, frontmatter: frontmatters[i] ?? null })))
    } catch (err) {
      setError(String(err))
    }
  }

  useEffect(() => { void load() }, [])

  async function handleRemove(id: string) {
    try {
      await window.aide.remove(id)
      toast(`Removed mod "${id}"`, 'success')
      void load()
    } catch (err) {
      toast(`Failed to remove: ${err}`, 'error')
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderBody() {
    if (error) {
      return <div className="empty" style={{ color: 'var(--error)' }}>Failed to load: {error}</div>
    }
    if (items === null) {
      return <div className="empty"><span className="empty-icon">⏳</span>Loading mods...</div>
    }
    if (items.length === 0) {
      return (
        <div className="empty">
          <span className="empty-icon">📦</span>
          No mods installed yet.<br />
          Click <strong>Initialize ~/.aide</strong> to get started.
        </div>
      )
    }
    return (
      <>
        {items.map(({ mod, frontmatter }) => {
          const expanded = expandedIds.has(mod.id)
          return (
            <div
              key={mod.id}
              className={`mod-item${expanded ? ' expanded' : ''}`}
            >
              <div
                className="mod-row"
                onClick={e => {
                  if ((e.target as Element).closest('button')) return
                  if (mod.type === 'skill') toggleExpanded(mod.id)
                }}
              >
                {mod.type === 'skill' && <span className="skill-chevron">▶</span>}
                <span className={`badge badge-${mod.type}`}>{mod.type}</span>
                <span className="mod-name">{mod.id}</span>
                <span className="mod-version">v{mod.version}</span>
                <span className="mod-path">{mod.path}</span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={e => { e.stopPropagation(); void handleRemove(mod.id) }}
                >
                  Remove
                </button>
              </div>
              {mod.type === 'skill' && (
                <div className="skill-detail">
                  <SkillDetail frontmatter={frontmatter} />
                </div>
              )}
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div className="page active" style={{ display: 'flex' }}>
      <div className="page-header">
        <div className="page-title">Installed Skills</div>
        <div className="page-desc">Agents, skills, and templates in your global library</div>
      </div>
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Global Library</span>
            <button className="btn btn-secondary btn-sm" onClick={() => { void load() }}>
              Refresh
            </button>
          </div>
          <div className="list-body">
            {renderBody()}
          </div>
        </div>
      </div>
    </div>
  )
}
