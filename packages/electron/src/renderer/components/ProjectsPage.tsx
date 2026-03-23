import { useState, useEffect } from 'react'
import type { LinkedProject } from '@aide/core'
import { useToast } from '../hooks/useToast.js'

interface ProjectsPageProps {
  onOpenProject: (path: string) => void
}

export function ProjectsPage({ onOpenProject }: ProjectsPageProps) {
  const { toast } = useToast()
  const [projects, setProjects] = useState<LinkedProject[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setProjects(null)
    setError(null)
    try {
      const registry = await window.aide.readRegistry()
      setProjects(Object.values(registry.linked_projects))
    } catch (err) {
      setError(String(err))
    }
  }

  useEffect(() => { void load() }, [])

  async function handleUnlink(projectPath: string) {
    try {
      await window.aide.unlink(projectPath)
      toast('Unlinked project', 'success')
      void load()
    } catch (err) {
      toast(`Failed to unlink: ${err}`, 'error')
    }
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
        {projects.map(p => (
          <div key={p.project_path} className="project-item">
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="project-path">{p.project_path}</div>
              <div className="project-templates">
                {p.applied_templates.length
                  ? p.applied_templates.join(', ')
                  : 'No templates applied'}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenProject(p.project_path)}
            >
              Open →
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => { void handleUnlink(p.project_path) }}
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
