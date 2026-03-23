import { useState, useEffect } from 'react'
import type { ProjectSkill, ProjectSkillsResult } from '@aide/core'
import { useToast } from '../hooks/useToast.js'
import { SkillDetail } from './shared/SkillDetail.js'
import { SplitButton } from './shared/SplitButton.js'

type SkillFilter = 'all' | 'library-active' | 'library-inactive' | 'local' | 'archived'

interface ProjectDetailPageProps {
  projectPath: string
  onBack: () => void
}

/** Derive short AI tool name from a skill rel path, e.g. ".codex/skills" → "codex" */
function aiToolName(rel: string): string {
  const part = rel.split('/')[0] ?? rel
  return part.replace(/^\./, '')
}

export function ProjectDetailPage({ projectPath, onBack }: ProjectDetailPageProps) {
  const { toast } = useToast()
  const [result, setResult] = useState<ProjectSkillsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<SkillFilter>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [restoreWarnings, setRestoreWarnings] = useState<Map<string, string>>(new Map())

  async function load() {
    setError(null)
    try {
      const r = await window.aide.listProjectSkills(projectPath)
      setResult(r)
    } catch (err) {
      setError(String(err))
    }
  }

  useEffect(() => {
    void load()
    setFilter('all')
    setExpandedIds(new Set())
    setRestoreWarnings(new Map())
  }, [projectPath])

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleEnable(skillId: string, targetRels?: string[]) {
    try {
      const r = await window.aide.enableProjectSkill(projectPath, skillId, targetRels)
      if (r.restore_warning) {
        toast(`Enabled with warning — hover ⚠ for details`, 'success')
        setRestoreWarnings(prev => new Map(prev).set(skillId, r.restore_warning!))
      } else {
        toast(`Enabled "${skillId}"`, 'success')
      }
      await load()
    } catch (err) {
      toast(`Failed to enable: ${err}`, 'error')
    }
  }

  async function handleDisable(skillId: string) {
    try {
      const r = await window.aide.disableProjectSkill(projectPath, skillId)
      if (r.warnings && r.warnings.length > 0) {
        toast(`Disabled "${skillId}" — ${r.warnings[0]}`, 'error')
      } else {
        toast(`Disabled "${skillId}"`, 'success')
      }
      void load()
    } catch (err) {
      toast(`Failed to disable: ${err}`, 'error')
    }
  }

  async function handleCopy(skillId: string, targetRels?: string[]) {
    try {
      const r = await window.aide.copyProjectSkill(projectPath, skillId, targetRels)
      toast(`Enabled "${skillId}" in ${r.copied_to.length} dir(s)`, 'success')
      void load()
    } catch (err) {
      toast(`Failed to copy skill: ${err}`, 'error')
    }
  }

  async function handleImport(skillId: string) {
    try {
      const r = await window.aide.importProjectSkill(projectPath, skillId)
      toast(`Imported as "${r.imported_as}"`, 'success')
      void load()
    } catch (err) {
      toast(`Failed to import: ${err}`, 'error')
    }
  }

  function buildActions(skill: ProjectSkill) {
    const activeRels = result?.active_skill_rels ?? []

    switch (skill.status) {
      case 'library-inactive': {
        if (activeRels.length > 1) {
          return (
            <SplitButton
              mainLabel="Enable"
              onMainClick={() => { void handleEnable(skill.id) }}
              items={[
                { label: 'All frameworks', onClick: () => { void handleEnable(skill.id) } },
                ...activeRels.map(r => ({
                  label: `${aiToolName(r)} only`,
                  onClick: () => { void handleEnable(skill.id, [r]) },
                })),
              ]}
            />
          )
        }
        return (
          <button className="btn btn-secondary btn-sm" onClick={() => { void handleEnable(skill.id) }}>
            Enable
          </button>
        )
      }

      case 'library-active':
        return (
          <button className="btn btn-danger btn-sm" onClick={() => { void handleDisable(skill.id) }}>
            Disable
          </button>
        )

      case 'local-unique':
      case 'local-modified': {
        const missing = activeRels.filter(r => !(skill.all_project_rels ?? []).includes(r))
        let copyBtn: React.ReactNode = null
        if (missing.length > 1) {
          copyBtn = (
            <SplitButton
              mainLabel="Enable for all"
              onMainClick={() => { void handleCopy(skill.id) }}
              items={[
                { label: 'All frameworks', onClick: () => { void handleCopy(skill.id) } },
                ...missing.map(r => ({
                  label: `${aiToolName(r)} only`,
                  onClick: () => { void handleCopy(skill.id, [r]) },
                })),
              ]}
            />
          )
        } else if (missing.length === 1) {
          const r = missing[0]!
          copyBtn = (
            <button className="btn btn-secondary btn-sm" onClick={() => { void handleCopy(skill.id, [r]) }}>
              Enable for {aiToolName(r)}
            </button>
          )
        }
        return (
          <>
            {copyBtn}
            <button className="btn btn-danger btn-sm" onClick={() => { void handleDisable(skill.id) }}>
              Disable
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => { void handleImport(skill.id) }}>
              Import to Library
            </button>
          </>
        )
      }

      case 'archived': {
        const rels = skill.original_rels ?? []
        if (rels.length > 1) {
          return (
            <SplitButton
              mainLabel="Enable"
              onMainClick={() => { void handleEnable(skill.id) }}
              items={[
                { label: 'All frameworks', onClick: () => { void handleEnable(skill.id) } },
                ...rels.map(r => ({
                  label: `${aiToolName(r)} only`,
                  onClick: () => { void handleEnable(skill.id, [r]) },
                })),
              ]}
            />
          )
        }
        return (
          <button className="btn btn-secondary btn-sm" onClick={() => { void handleEnable(skill.id) }}>
            Enable
          </button>
        )
      }

      default:
        return null
    }
  }

  function getFiltered(): ProjectSkill[] {
    if (!result) return []
    return result.skills.filter(s => {
      if (filter === 'all') return true
      if (filter === 'local') return s.status === 'local-unique' || s.status === 'local-modified'
      return s.status === filter
    })
  }

  const projectName = projectPath.split('/').pop() ?? projectPath
  const filtered = getFiltered()
  const filters: { key: SkillFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'library-active', label: 'Active' },
    { key: 'library-inactive', label: 'Library' },
    { key: 'local', label: 'Local' },
    { key: 'archived', label: 'Archived' },
  ]

  function renderSkillList() {
    if (error) {
      return <div className="empty" style={{ color: 'var(--error)' }}>Failed to load: {error}</div>
    }
    if (!result) {
      return <div className="empty"><span className="empty-icon">⏳</span>Loading...</div>
    }
    if (filtered.length === 0) {
      return <div className="empty"><span className="empty-icon">🔍</span>No skills match this filter.</div>
    }
    return (
      <>
        {filtered.map(skill => {
          const expanded = expandedIds.has(skill.id)
          const statusLabel = skill.status.replace(/-/g, ' ')
          const allRels = skill.all_project_rels?.length
            ? skill.all_project_rels
            : skill.original_rels?.length
              ? skill.original_rels
              : []
          const warning = restoreWarnings.get(skill.id)

          return (
            <div
              key={skill.id}
              className={`skill-item${expanded ? ' expanded' : ''}`}
            >
              <div
                className="skill-row"
                onClick={e => {
                  const t = e.target as Element
                  if (t.closest('button') || t.closest('.btn-split-arrow') || t.closest('.split-dropdown')) return
                  toggleExpanded(skill.id)
                }}
              >
                <span className="skill-chevron">▶</span>
                <span className={`skill-status-badge status-${skill.status}`}>{statusLabel}</span>
                <div className="skill-meta">
                  <span className="skill-name">{skill.id}</span>
                  {allRels.length > 0 && (
                    <span className="skill-ai-badges">
                      {allRels.map(r => (
                        <span key={r} className="skill-ai-badge">{aiToolName(r)}</span>
                      ))}
                    </span>
                  )}
                </div>
                <div className="skill-actions">
                  {warning && (
                    <span className="restore-warning" data-tip={warning}>⚠</span>
                  )}
                  {buildActions(skill)}
                </div>
              </div>
              <div className="skill-detail">
                <SkillDetail frontmatter={skill.frontmatter} />
              </div>
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div className="page active" style={{ display: 'flex' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="page-title">{projectName}</div>
          <div className="page-desc">{projectPath}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => { void load() }}>
          Refresh
        </button>
      </div>
      <div className="page-content">
        <div className="skill-filter-bar">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              className={`skill-filter-btn${filter === key ? ' active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="card">
          <div className="list-body">
            {renderSkillList()}
          </div>
        </div>
      </div>
    </div>
  )
}
