import { useEffect, useState } from 'react'
import type { LinkedProject } from '@aide/core'
import { useToast } from '../hooks/useToast.js'

interface ProjectsPageProps {
  onOpenProject: (path: string) => void
}

type GlobalSkillSummaries = Record<string, string[] | null>

function summarizeSkills(skillIds: string[]): string[] {
  return [...skillIds].sort((left, right) => left.localeCompare(right))
}

export function ProjectsPage({ onOpenProject }: ProjectsPageProps) {
  const { toast } = useToast()
  const [projects, setProjects] = useState<LinkedProject[] | null>(null)
  const [globalSkillSummaries, setGlobalSkillSummaries] = useState<GlobalSkillSummaries>({})
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setProjects(null)
    setGlobalSkillSummaries({})
    setError(null)

    try {
      const registry = await window.aide.readRegistry()
      const linkedProjects = Object.values(registry.linked_projects)
      setProjects(linkedProjects)

      const settled = await Promise.allSettled(
        linkedProjects.map(async project => {
          const result = await window.aide.listProjectSkills(project.project_path)
          return [
            project.project_path,
            summarizeSkills(result.skills.filter(skill => skill.is_global).map(skill => skill.id)),
          ] as const
        }),
      )

      const summaries: GlobalSkillSummaries = {}
      for (const entry of settled) {
        if (entry.status === 'fulfilled') {
          const [projectPath, skillIds] = entry.value
          summaries[projectPath] = skillIds
        }
      }
      setGlobalSkillSummaries(summaries)
    } catch (err) {
      setError(String(err))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleUnlink(projectPath: string) {
    try {
      await window.aide.unlink(projectPath)
      toast('Unlinked project', 'success')
      void load()
    } catch (err) {
      toast(`Failed to unlink: ${err}`, 'error')
    }
  }

  function renderGlobalSummary(projectPath: string) {
    const summary = globalSkillSummaries[projectPath]
    if (summary === undefined || summary === null) return null

    if (summary.length === 0) {
      return <div className="project-global-summary">Global skills: none</div>
    }

    const visible = summary.slice(0, 3)
    const remaining = summary.length - visible.length

    return (
      <div className="project-global-summary">
        <span className="project-global-label">Global skills</span>
        <div className="project-global-pills">
          {visible.map(skillId => (
            <span key={skillId} className="project-global-pill">{skillId}</span>
          ))}
          {remaining > 0 && <span className="project-global-pill">+{remaining} more</span>}
        </div>
      </div>
    )
  }

  function renderBody() {
    if (error) {
      return <div className="empty" style={{ color: 'var(--error)' }}>Failed to load: {error}</div>
    }
    if (projects === null) {
      return <div className="empty"><span className="empty-icon">⏳</span>Loading...</div>
    }
    if (projects.length === 0) {
      return <div className="empty"><span className="empty-icon">🔗</span>No linked projects yet.</div>
    }

    return (
      <>
        {projects.map(project => (
          <div key={project.project_path} className="project-item">
            <div className="project-main">
              <div className="project-path">{project.project_path}</div>
              <div className="project-templates">
                {project.applied_templates.length
                  ? project.applied_templates.join(', ')
                  : 'No templates applied'}
              </div>
              {renderGlobalSummary(project.project_path)}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onOpenProject(project.project_path)}>
              Open →
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => { void handleUnlink(project.project_path) }}
            >
              Unlink
            </button>
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="page active" style={{ display: 'flex' }}>
      <div className="page-header">
        <div className="page-title">Linked Projects</div>
        <div className="page-desc">Projects that receive automatic template propagation</div>
      </div>
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Active Links</span>
          </div>
          <div className="list-body">
            {renderBody()}
          </div>
        </div>
      </div>
    </div>
  )
}
