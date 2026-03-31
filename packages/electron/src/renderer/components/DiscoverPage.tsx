import { useEffect, useState } from 'react'
import type { DiscoveredFile, RemoteSkill } from '@aide/core'
import { useToast } from '../hooks/useToast.js'
import { SkillDetail } from './shared/SkillDetail.js'

type Tab = 'local' | 'repositories'

export function DiscoverPage() {
  const [tab, setTab] = useState<Tab>('repositories')

  return (
    <div className="page active" style={{ display: 'flex' }}>
      <div className="page-header">
        <div className="page-title">Discover</div>
        <div className="page-desc">Find and install AI skills from your filesystem or GitHub repositories</div>
      </div>
      <div className="page-content">
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          <button
            className={`btn btn-sm${tab === 'repositories' ? ' btn-primary' : ' btn-secondary'}`}
            onClick={() => setTab('repositories')}
          >
            Repositories
          </button>
          <button
            className={`btn btn-sm${tab === 'local' ? ' btn-primary' : ' btn-secondary'}`}
            onClick={() => setTab('local')}
          >
            Local
          </button>
        </div>
        {tab === 'local' ? <LocalTab /> : <RepositoriesTab />}
      </div>
    </div>
  )
}

function LocalTab() {
  const { toast } = useToast()
  const [scanResults, setScanResults] = useState<DiscoveredFile[]>([])
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState(false)

  async function handleScan() {
    setScanning(true)
    setChecked(new Set())
    setError(null)
    try {
      const result = await window.aide.discover()
      const files = result.found.filter(f => f.type !== 'template')
      setScanResults(files)
      setScanned(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setScanning(false)
    }
  }

  async function handleImportSelected() {
    const indices = [...checked]
    if (indices.length === 0) return
    setImporting(true)
    let imported = 0
    const errors: string[] = []
    for (const idx of indices) {
      const file = scanResults[idx]
      if (!file) continue
      try {
        await window.aide.add({ filePath: file.path, type: file.type })
        imported++
      } catch (err) {
        errors.push(`${file.name}: ${err}`)
      }
    }
    if (imported > 0) toast(`Imported ${imported} file${imported > 1 ? 's' : ''}`, 'success')
    if (errors.length > 0) setError(errors.join('\n'))
    setImporting(false)
    await handleScan()
  }

  function toggleCheck(idx: number) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const anyChecked = [...checked].length > 0
  const newCount = scanResults.filter(f => !f.already_imported).length

  function renderList() {
    if (scanning) {
      return <div className="empty"><span className="empty-icon">⏳</span>Scanning your home directory...</div>
    }
    if (!scanned) {
      return (
        <div className="empty">
          <span className="empty-icon">🔍</span>
          Click <strong>Scan ~/ Now</strong> to find agent markdowns and skill scripts on your system.
        </div>
      )
    }
    if (scanResults.length === 0) {
      return <div className="empty"><span className="empty-icon">🔍</span>No AI context files found.</div>
    }
    return (
      <>
        {scanResults.map((f, i) => (
          <div key={i} className="mod-item" style={{ flexDirection: 'row', alignItems: 'center', padding: '9px 14px', gap: '10px' }}>
            <input
              type="checkbox"
              className="discover-check"
              style={{ flexShrink: 0, cursor: f.already_imported ? 'default' : 'pointer' }}
              disabled={f.already_imported}
              checked={checked.has(i)}
              onChange={() => toggleCheck(i)}
            />
            <span className={`badge badge-${f.type}`}>{f.type}</span>
            <span className="mod-name">{f.name}</span>
            <span className="mod-path">{f.path}</span>
            {f.already_imported && <span className="pill">Imported</span>}
          </div>
        ))}
      </>
    )
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Scan Results</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={!anyChecked || importing}
              onClick={() => { void handleImportSelected() }}
            >
              {importing ? 'Importing...' : 'Import Selected'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={scanning}
              onClick={() => { void handleScan() }}
            >
              {scanning ? 'Scanning...' : 'Scan ~/ Now'}
            </button>
          </div>
        </div>
        <div className="list-body">
          {renderList()}
        </div>
      </div>
      {error && (
        <div className="feedback show-error">{error}</div>
      )}
      {scanned && !scanning && newCount === 0 && scanResults.length > 0 && (
        <div className="feedback show-info">All discovered files have already been imported.</div>
      )}
    </>
  )
}

function RepositoriesTab() {
  const { toast } = useToast()
  const [skills, setSkills] = useState<RemoteSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(()=>{
    handleRefresh();
  }, [])

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    try {
      const result = await window.aide.listRemoteSkills()
      setSkills(result)
      setLoaded(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleInstall(skill: RemoteSkill) {
    setInstalling(prev => new Set(prev).add(skill.id))
    try {
      await window.aide.addRemoteSkill(skill.rawUrl, skill.id, skill.repo)
      toast(`Installed ${skill.frontmatter?.name ?? skill.id}`, 'success')
      setSkills(prev => prev.map(s => s.id === skill.id ? { ...s, already_installed: true } : s))
    } catch (err) {
      toast(`Error: ${err}`, 'error')
    } finally {
      setInstalling(prev => {
        const next = new Set(prev)
        next.delete(skill.id)
        return next
      })
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

  const grouped = skills.reduce<Record<string, RemoteSkill[]>>((acc, s) => {
    if (!acc[s.repo]) acc[s.repo] = []
    acc[s.repo]!.push(s)
    return acc
  }, {})

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Remote Skills</span>
          <button
            className="btn btn-primary btn-sm"
            disabled={loading}
            onClick={() => { void handleRefresh() }}
          >
            {loading ? 'Loading...' : loaded ? 'Refresh' : 'Load Skills'}
          </button>
        </div>
        <div className="list-body">
          {loading && (
            <div className="empty"><span className="empty-icon">⏳</span>Fetching skills from GitHub...</div>
          )}
          {!loading && !loaded && (
            <div className="empty">
              <span className="empty-icon">📦</span>
              Click <strong>Load Skills</strong> to browse skills from configured repositories.
            </div>
          )}
          {!loading && loaded && skills.length === 0 && (
            <div className="empty"><span className="empty-icon">📦</span>No skills found in configured repositories.</div>
          )}
          {!loading && loaded && Object.entries(grouped).map(([repo, repoSkills]) => (
            <div key={repo}>
              <div style={{ padding: '8px 14px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {repo}
              </div>
              {repoSkills.map(skill => {
                const expanded = expandedIds.has(skill.id)
                return (
                  <div key={skill.id} className={`mod-item${expanded ? ' expanded' : ''}`}>
                    <div
                      className="mod-row"
                      onClick={e => {
                        if ((e.target as Element).closest('button')) return
                        toggleExpanded(skill.id)
                      }}
                    >
                      <span className="skill-chevron">▶</span>
                      <span className="badge badge-skill">skill</span>
                      <span className="mod-name">{skill.frontmatter?.name ?? skill.id}</span>
                      <span className="mod-version">{skill.id}</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        title="View on GitHub"
                        onClick={() => { void window.aide.openExternal(skill.pageUrl) }}
                      >
                        ↗
                      </button>
                      {skill.already_installed
                        ? <span className="pill">Installed</span>
                        : (
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={installing.has(skill.id)}
                            onClick={() => { void handleInstall(skill) }}
                          >
                            {installing.has(skill.id) ? 'Installing...' : 'Install'}
                          </button>
                        )
                      }
                    </div>
                    <div className="skill-detail">
                      <SkillDetail frontmatter={skill.frontmatter} />
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {error && <div className="feedback show-error">{error}</div>}
    </>
  )
}
