import { useState } from 'react'
import type { GlobalConfig } from '@aide/core'

interface GeneralTabProps {
  config: GlobalConfig
  onSave: (updates: Partial<GlobalConfig>) => Promise<void>
}

export function GeneralTab({ config, onSave }: GeneralTabProps) {
  const [registryUrl, setRegistryUrl] = useState(config.registry_url ?? '')

  return (
    <>
      <div className="settings-row">
        <div>
          <div className="settings-label">Auto Propagate</div>
          <div className="settings-desc">Sync template changes to linked projects automatically</div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={config.auto_propagate}
            onChange={e => { void onSave({ auto_propagate: e.target.checked }) }}
          />
          <span className="toggle-track"></span>
        </label>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">Confirm Before Write</div>
          <div className="settings-desc">Prompt before modifying files outside ~/.aide</div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={config.confirm_before_write}
            onChange={e => { void onSave({ confirm_before_write: e.target.checked }) }}
          />
          <span className="toggle-track"></span>
        </label>
      </div>
      <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div className="settings-label">Registry URL</div>
          <div className="settings-desc">Remote source for installing mods by name</div>
        </div>
        <div className="inline-form" style={{ width: '100%', margin: 0 }}>
          <div className="form-group" style={{ flex: 1, margin: 0 }}>
            <input
              type="text"
              value={registryUrl}
              onChange={e => setRegistryUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const raw = registryUrl.trim()
              void onSave({ registry_url: raw === '' ? null : raw })
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}
