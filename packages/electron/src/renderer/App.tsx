import { useState, useEffect } from 'react'
import { ToastContext, useToastState } from './hooks/useToast.js'
import { Sidebar } from './components/Sidebar.js'
import { TopBar } from './components/TopBar.js'
import { Toast } from './components/Toast.js'
import { ModsPage } from './components/ModsPage.js'
import { DiscoverPage } from './components/DiscoverPage.js'
import { ProjectsPage } from './components/ProjectsPage.js'
import { ProjectDetailPage } from './components/ProjectDetailPage.js'
import { SettingsPage } from './components/SettingsPage.js'
import { TemplateEditorPage } from './components/TemplateEditorPage.js'
import { ProjectMapPage } from './components/ProjectMapPage.js'

export type Page = 'mods' | 'discover' | 'projects' | 'project-detail' | 'settings' | 'editor' | 'project-map'

function InitPrompt({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInit() {
    setLoading(true)
    setError(null)
    try {
      await window.aide.init()
      onDone()
    } catch (err) {
      setError(String(err))
      setLoading(false)
    }
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      background: 'var(--bg)',
    }}>
      <img className="welcome-mark" src="icon.svg" alt="" />
      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>Welcome to Aide</div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px', lineHeight: 1.6 }}>
        Set up your <code style={{ color: 'var(--accent)' }}>~/.aide</code> directory to get started managing AI context files.
      </div>
      {error && (
        <div style={{ fontSize: '12.5px', color: 'var(--error)', maxWidth: '300px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      <button
        className="btn btn-primary"
        disabled={loading}
        onClick={() => { void handleInit() }}
      >
        {loading ? 'Initializing…' : 'Initialize ~/.aide'}
      </button>
    </div>
  )
}

export function App() {
  const [initialized, setInitialized] = useState<boolean | null>(null)
  const [page, setPage] = useState<Page>('mods')
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const toastValue = useToastState()

  useEffect(() => {
    window.aide.isInitialized().then(setInitialized).catch(() => setInitialized(false))
  }, [])

  function navigate(p: Page, path?: string) {
    if (p === 'project-detail' && path) setProjectPath(path)
    setPage(p)
  }

  async function handleLinkProject() {
    const path = await window.aide.pickFolder()
    if (!path) return
    try {
      await window.aide.link({ projectPath: path })
      toastValue.toast(`Linked ${path}`, 'success')
      navigate('projects')
    } catch (err) {
      toastValue.toast(`Error: ${err}`, 'error')
    }
  }

  if (initialized === null) return null

  return (
    <ToastContext.Provider value={toastValue}>
      {!initialized ? (
        <InitPrompt onDone={() => setInitialized(true)} />
      ) : (
        <>
          <Sidebar activePage={page} onNavigate={navigate} />
          <div id="main">
            <TopBar onLinkProject={() => { void handleLinkProject() }} />
            {page === 'mods' && <ModsPage />}
            {page === 'discover' && <DiscoverPage />}
            {page === 'editor' && <TemplateEditorPage />}
            {page === 'projects' && (
              <ProjectsPage onOpenProject={path => navigate('project-detail', path)} />
            )}
            {page === 'project-detail' && projectPath !== null && (
              <ProjectDetailPage
                projectPath={projectPath}
                onBack={() => navigate('projects')}
              />
            )}
            {page === 'project-map' && <ProjectMapPage onNavigate={navigate} />}
            {page === 'settings' && <SettingsPage />}
          </div>
        </>
      )}
      <Toast />
    </ToastContext.Provider>
  )
}
