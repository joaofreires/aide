import { useState } from 'react'
import type { DiscoveredFile } from '@aide/core'
import { useToast } from '../hooks/useToast.js'

export function DiscoverPage() {
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
    <div className="page active" style={{ display: 'flex' }}>
      <div className="page-header">
        <div className="page-title">Discover</div>
        <div className="page-desc">Find AI context files on your system and import them into your library</div>
      </div>
      <div className="page-content">
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
      </div>
    </div>
  )
}
