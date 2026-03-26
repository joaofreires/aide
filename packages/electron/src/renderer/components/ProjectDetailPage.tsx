import { useEffect, useState } from 'react'
import type { ProjectSkill, ProjectSkillsResult } from '@aide/core'
import { useToast } from '../hooks/useToast.js'
import { SkillDetail } from './shared/SkillDetail.js'
import { SplitButton } from './shared/SplitButton.js'

type SkillFilter = 'all' | 'library-active' | 'library-inactive' | 'local' | 'archived'

interface ProjectDetailPageProps {
  projectPath: string
  onBack: () => void
}

function aiToolName(rel: string): string {
  const part = rel.split('/')[0] ?? rel
  return part.replace(/^\./, '')
}

function isGlobalArchived(skill: ProjectSkill): boolean {
  return Boolean(skill.global_archive_path) && !skill.is_global && skill.preferred_enable_scope === 'global'
}

function providerRels(skill: ProjectSkill): string[] {
  const rels = skill.all_project_rels.length
    ? skill.all_project_rels
    : skill.global_rels.length
      ? skill.global_rels
      : skill.original_rels.length
        ? skill.original_rels
        : skill.global_original_rels

  return [...new Set(rels)]
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
      const next = await window.aide.listProjectSkills(projectPath)
      setResult(next)
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
      const response = await window.aide.enableProjectSkill(projectPath, skillId, targetRels)
      setRestoreWarnings(prev => {
        const next = new Map(prev)
        next.delete(skillId)
        if (response.restore_warning) next.set(skillId, response.restore_warning)
        return next
      })

      const label = response.enabled_scope === 'global' ? 'Enabled Global' : 'Enabled'
      if (response.restore_warning) {
        toast(`${label} "${skillId}" with warning — hover ⚠ for details`, 'success')
      } else {
        toast(`${label} "${skillId}"`, 'success')
      }
      await load()
    } catch (err) {
      toast(`Failed to enable: ${err}`, 'error')
    }
  }

  async function handleDisable(skillId: string) {
    try {
      const response = await window.aide.disableProjectSkill(projectPath, skillId)
      const label = response.disabled_scope === 'global' ? 'Disabled Global' : 'Disabled'

      if (response.warnings.length > 0) {
        toast(`${label} "${skillId}" — ${response.warnings[0]}`, 'success')
      } else {
        toast(`${label} "${skillId}"`, 'success')
      }
      await load()
    } catch (err) {
      toast(`Failed to disable: ${err}`, 'error')
    }
  }

  async function handleCopy(skillId: string, targetRels?: string[]) {
    try {
      const response = await window.aide.copyProjectSkill(projectPath, skillId, targetRels)
      toast(`Enabled "${skillId}" in ${response.copied_to.length} dir(s)`, 'success')
      await load()
    } catch (err) {
      toast(`Failed to copy skill: ${err}`, 'error')
    }
  }

  async function handleImport(skillId: string) {
    try {
      const response = await window.aide.importProjectSkill(projectPath, skillId)
      toast(`Imported as "${response.imported_as}"`, 'success')
      await load()
    } catch (err) {
      toast(`Failed to import: ${err}`, 'error')
    }
  }

  function buildProjectEnableButton(skillId: string, rels: string[]): React.ReactNode {
    if (rels.length > 1) {
      return (
        <SplitButton
          mainLabel="Enable"
          onMainClick={() => { void handleEnable(skillId) }}
          items={[
            { label: 'All frameworks', onClick: () => { void handleEnable(skillId) } },
            ...rels.map(rel => ({
              label: `${aiToolName(rel)} only`,
              onClick: () => { void handleEnable(skillId, [rel]) },
            })),
          ]}
        />
      )
    }

    return (
      <button className="btn btn-secondary btn-sm" onClick={() => { void handleEnable(skillId) }}>
        Enable
      </button>
    )
  }

  function buildActions(skill: ProjectSkill) {
    const activeRels = result?.active_skill_rels ?? []
    const canEnableGlobal = isGlobalArchived(skill)
    const globalEnableButton = canEnableGlobal ? (
      <button className="btn btn-secondary btn-sm" onClick={() => { void handleEnable(skill.id) }}>
        Enable Global
      </button>
    ) : null

    switch (skill.status) {
      case 'library-inactive':
        return canEnableGlobal
          ? globalEnableButton
          : buildProjectEnableButton(skill.id, activeRels)

      case 'library-active':
        return (
          <>
            {globalEnableButton}
            <button className="btn btn-danger btn-sm" onClick={() => { void handleDisable(skill.id) }}>
              {skill.is_global ? 'Disable Global' : 'Disable'}
            </button>
          </>
        )

      case 'local-unique':
      case 'local-modified': {
        const missing = skill.project_path
          ? activeRels.filter(rel => !skill.all_project_rels.includes(rel))
          : []

        let copyButton: React.ReactNode = null
        if (missing.length > 1) {
          copyButton = (
            <SplitButton
              mainLabel="Enable for all"
              onMainClick={() => { void handleCopy(skill.id) }}
              items={[
                { label: 'All frameworks', onClick: () => { void handleCopy(skill.id) } },
                ...missing.map(rel => ({
                  label: `${aiToolName(rel)} only`,
                  onClick: () => { void handleCopy(skill.id, [rel]) },
                })),
              ]}
            />
          )
        } else if (missing.length === 1) {
          copyButton = (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { void handleCopy(skill.id, [missing[0]!]) }}
            >
              Enable for {aiToolName(missing[0]!)}
            </button>
          )
        }

        return (
          <>
            {globalEnableButton}
            {copyButton}
            <button className="btn btn-danger btn-sm" onClick={() => { void handleDisable(skill.id) }}>
              {skill.is_global ? 'Disable Global' : 'Disable'}
            </button>
            {(skill.project_path || skill.global_paths.length > 0) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { void handleImport(skill.id) }}>
                Import to Library
              </button>
            )}
          </>
        )
      }

      case 'archived':
        return canEnableGlobal
          ? globalEnableButton
          : buildProjectEnableButton(skill.id, skill.original_rels)

      default:
        return null
    }
  }

  function getFiltered(): ProjectSkill[] {
    if (!result) return []

    return result.skills.filter(skill => {
      const globalArchived = isGlobalArchived(skill)

      if (filter === 'all') return true
      if (filter === 'local') return skill.status === 'local-unique' || skill.status === 'local-modified'
      if (filter === 'archived') return skill.status === 'archived' || globalArchived
      if (filter === 'library-inactive') return skill.status === 'library-inactive' && !globalArchived
      return skill.status === filter
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
          const rels = providerRels(skill)
          const warning = restoreWarnings.get(skill.id)
          const showGlobalPill = skill.is_global || Boolean(skill.global_archive_path)

          return (
            <div key={skill.id} className={`skill-item${expanded ? ' expanded' : ''}`}>
              <div
                className="skill-row"
                onClick={event => {
                  const target = event.target as Element
                  if (target.closest('button') || target.closest('.btn-split-arrow') || target.closest('.split-dropdown')) return
                  toggleExpanded(skill.id)
                }}
              >
                <span className="skill-chevron">▶</span>
                <span className={`skill-status-badge status-${skill.status}`}>{skill.status.replace(/-/g, ' ')}</span>
                <div className="skill-meta">
                  <span className="skill-name">{skill.id}</span>
                  {showGlobalPill && <span className="skill-scope-pill">Global</span>}
                  {rels.length > 0 && (
                    <span className="skill-ai-badges">
                      {rels.map(rel => (
                        <span key={rel} className="skill-ai-badge">{aiToolName(rel)}</span>
                      ))}
                    </span>
                  )}
                </div>
                <div className="skill-actions">
                  {warning && <span className="restore-warning" data-tip={warning}>⚠</span>}
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
