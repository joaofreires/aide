import { useEffect, useState } from 'react'
import type { DiscoveredFile, RemoteSkill, MarketplaceSkill, SkillsShPackage } from '@aide/core'
import { useToast } from '../hooks/useToast.js'
import { SkillDetail } from './shared/SkillDetail.js'

type Tab = 'repositories' | 'marketplace' | 'skillssh' | 'local'

export function DiscoverPage() {
  const [tab, setTab] = useState<Tab>('repositories')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'repositories', label: 'Repositories', icon: '📦' },
    { key: 'marketplace', label: 'Marketplace', icon: '🏪' },
    { key: 'skillssh', label: 'skills.sh', icon: '⚡' },
    { key: 'local', label: 'Local', icon: '💾' },
  ]

  return (
    <div className="page active" style={{ display: 'flex' }}>
      <div className="page-header">
        <div className="page-title">Discover</div>
        <div className="page-desc">Find and install AI skills from multiple sources</div>
      </div>
      <div className="page-content">
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              className={`btn btn-sm${tab === t.key ? ' btn-primary' : ' btn-secondary'}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        {tab === 'repositories' && <RepositoriesTab />}
        {tab === 'marketplace' && <MarketplaceTab />}
        {tab === 'skillssh' && <SkillsShTab />}
        {tab === 'local' && <LocalTab />}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   LOCAL TAB (unchanged from original)
   ═══════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════
   REPOSITORIES TAB (unchanged from original)
   ═══════════════════════════════════════════════ */
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

  async function handleRefresh(forceRefresh = false) {
    setLoading(true)
    setError(null)
    try {
      const result = await window.aide.listRemoteSkills(forceRefresh)
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
            onClick={() => { void handleRefresh(true) }}
          >
            {loading ? 'Loading...' : loaded ? 'Force Refresh' : 'Load Skills'}
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

/* ═══════════════════════════════════════════════
   MARKETPLACE TAB (NEW)
   ═══════════════════════════════════════════════ */
function MarketplaceTab() {
  const { toast } = useToast()
  const [skills, setSkills] = useState<MarketplaceSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')

  async function handleLoad(forceRefresh = false) {
    setLoading(true)
    setError(null)
    try {
      const result = await window.aide.listMarketplaceSkills(forceRefresh)
      setSkills(result)
      setLoaded(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void handleLoad() }, [])

  async function handleInstall(skill: MarketplaceSkill) {
    setInstalling(prev => new Set(prev).add(skill.id))
    try {
      await window.aide.addRemoteSkill(skill.download_url, skill.id, 'marketplace')
      toast(`Installed "${skill.name}"`, 'success')
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

  const filtered = skills.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
  })

  if (!loaded && !loading && !error) {
    return (
      <div className="empty">
        <span className="empty-icon">🏪</span>
        <br />
        Configure a <strong>Registry URL</strong> in Settings → General to browse community skills.
      </div>
    )
  }

  return (
    <>
      {loaded && skills.length > 0 && (
        <div className="marketplace-search">
          <input
            type="text"
            placeholder="Search skills by name, description, or tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            className="btn btn-secondary btn-sm"
            disabled={loading}
            onClick={() => { void handleLoad(true) }}
          >
            Force Refresh
          </button>
        </div>
      )}

      {loading && (
        <div className="empty"><span className="empty-icon">⏳</span>Loading marketplace…</div>
      )}

      {!loading && loaded && (
        <div className="marketplace-grid">
          {filtered.length === 0 ? (
            <div className="marketplace-empty">
              <span className="empty-icon">🔍</span>
              {search ? 'No skills match your search.' : 'No skills available.'}
            </div>
          ) : (
            filtered.map(skill => (
              <div key={skill.id} className="marketplace-card">
                <div className="marketplace-card-header">
                  <span className="marketplace-card-name">{skill.name}</span>
                  <span className="marketplace-card-version">v{skill.version}</span>
                </div>
                <div className="marketplace-card-desc">{skill.description || 'No description'}</div>
                {skill.tags.length > 0 && (
                  <div className="marketplace-card-tags">
                    {skill.tags.map(tag => (
                      <span key={tag} className="marketplace-card-tag">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="marketplace-card-footer">
                  <span className="marketplace-card-author">by {skill.author}</span>
                  {skill.already_installed ? (
                    <span className="pill">Installed</span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={installing.has(skill.id)}
                      onClick={() => { void handleInstall(skill) }}
                    >
                      {installing.has(skill.id) ? 'Installing…' : 'Install'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {error && <div className="feedback show-error">{error}</div>}
    </>
  )
}

/* ═══════════════════════════════════════════════
   SKILLS.SH TAB (LIVE)
   ═══════════════════════════════════════════════ */
function SkillsShTab() {
  const { toast } = useToast()
  const [packages, setPackages] = useState<SkillsShPackage[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')

  async function handleLoad(forceRefresh = false) {
    setLoading(true)
    setError(null)
    try {
      const result = await window.aide.listSkillsShPackages(forceRefresh)
      setPackages(result)
      setLoaded(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void handleLoad() }, [])

  async function handleInstall(pkg: SkillsShPackage) {
    setInstalling(prev => new Set(prev).add(pkg.id))
    try {
      const result = await window.aide.installSkillsShPackage(pkg.rawUrl, pkg.id)
      if (result.success) {
        toast(`Installed "${pkg.name}" from skills.sh`, 'success')
        setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, already_installed: true } : p))
      } else {
        toast(`Error: ${result.error}`, 'error')
      }
    } catch (err) {
      toast(`Error: ${err}`, 'error')
    } finally {
      setInstalling(prev => {
        const next = new Set(prev)
        next.delete(pkg.id)
        return next
      })
    }
  }

  const filtered = packages.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.owner.toLowerCase().includes(q) ||
      p.repo.toLowerCase().includes(q)
  })

  return (
    <>
      <div className="skillssh-banner">
        <span className="skillssh-banner-icon">⚡</span>
        <div className="skillssh-banner-text">
          <div className="skillssh-banner-title">skills.sh Integration</div>
          <div className="skillssh-banner-desc">
            Browse and install skills from the <a href="https://skills.sh" style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={e => { e.preventDefault(); void window.aide.openExternal('https://skills.sh') }}>skills.sh</a> ecosystem.
            Aide downloads them from GitHub and manages them in your <code style={{ color: 'var(--accent)' }}>~/.aide/</code> directory.
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          disabled={loading}
          onClick={() => { void handleLoad(loaded) }}
        >
          {loading ? 'Loading…' : loaded ? 'Force Refresh' : 'Load Catalog'}
        </button>
      </div>

      {loaded && packages.length > 0 && (
        <div className="marketplace-search">
          <input
            type="text"
            placeholder="Search skills.sh by name, owner, or repo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {loading && (
        <div className="empty"><span className="empty-icon">⏳</span>Fetching skills.sh catalog (this may take a moment)…</div>
      )}

      {!loading && loaded && (
        <div className="marketplace-grid">
          {filtered.length === 0 ? (
            <div className="marketplace-empty">
              <span className="empty-icon">⚡</span>
              {packages.length === 0
                ? 'Could not load skills from skills.sh. Check your internet connection.'
                : 'No packages match your search.'}
            </div>
          ) : (
            filtered.map(pkg => (
              <div key={`${pkg.owner}/${pkg.repo}/${pkg.id}`} className="marketplace-card">
                <div className="marketplace-card-header">
                  <span className="marketplace-card-name">{pkg.name}</span>
                  {pkg.installs !== '0' && (
                    <span className="marketplace-card-version">{pkg.installs} installs</span>
                  )}
                </div>
                <div className="marketplace-card-desc">{pkg.description || 'No description available'}</div>
                <div className="marketplace-card-tags">
                  <span className="marketplace-card-tag">{pkg.owner}/{pkg.repo}</span>
                </div>
                <div className="marketplace-card-footer">
                  <span className="marketplace-card-author">
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => { void window.aide.openExternal(pkg.homepageUrl) }}
                    >
                      skills.sh ↗
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginLeft: '4px', padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => { void window.aide.openExternal(pkg.pageUrl) }}
                    >
                      GitHub ↗
                    </button>
                  </span>
                  {pkg.already_installed ? (
                    <span className="pill">Installed</span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={installing.has(pkg.id)}
                      onClick={() => { void handleInstall(pkg) }}
                    >
                      {installing.has(pkg.id) ? 'Installing…' : 'Install'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {error && <div className="feedback show-error">{error}</div>}
    </>
  )
}

