import { useState } from 'react'
import type { GlobalConfig } from '@aide/core'

interface VariablesTabProps {
  config: GlobalConfig
  onSave: (updates: Partial<GlobalConfig>) => Promise<void>
}

export function VariablesTab({ config, onSave }: VariablesTabProps) {
  const [keyInput, setKeyInput] = useState('')
  const [valInput, setValInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    const key = keyInput.trim()
    if (!key) {
      setError('Key is required')
      return
    }
    setError(null)
    await onSave({ default_variables: { ...config.default_variables, [key]: valInput.trim() } })
    setKeyInput('')
    setValInput('')
  }

  async function handleRemove(key: string) {
    const updated = { ...config.default_variables }
    delete updated[key]
    await onSave({ default_variables: updated })
  }

  const entries = Object.entries(config.default_variables)

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Default Variables</span></div>
      <div className="list-body">
        {entries.length === 0 ? (
          <div className="empty" style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'left' }}>
            No variables defined
          </div>
        ) : (
          entries.map(([k, v]) => (
            <div key={k} className="list-item">
              <span className="list-item-label">{k}</span>
              <span className="list-item-badge">{v}</span>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => { void handleRemove(k) }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
      <div className="card-body">
        <div className="inline-form">
          <div className="form-group">
            <label>Key</label>
            <input
              type="text"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="MY_VAR"
            />
          </div>
          <div className="form-group">
            <label>Value</label>
            <input
              type="text"
              value={valInput}
              onChange={e => setValInput(e.target.value)}
              placeholder="value"
              onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => { void handleAdd() }}>Add</button>
        </div>
        {error && <div className="feedback show-error">{error}</div>}
      </div>
    </div>
  )
}
