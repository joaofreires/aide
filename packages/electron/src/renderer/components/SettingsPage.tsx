import { useState, useEffect } from 'react'
import type { GlobalConfig } from '@aide/core'
import { useToast } from '../hooks/useToast.js'
import { GeneralTab } from './settings/GeneralTab.js'
import { DiscoveryTab } from './settings/DiscoveryTab.js'
import { VariablesTab } from './settings/VariablesTab.js'

type SettingsTab = 'general' | 'discovery' | 'variables'

export function SettingsPage() {
  const { toast } = useToast()
  const [config, setConfig] = useState<GlobalConfig | null>(null)
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  async function load() {
    try {
      const cfg = await window.aide.readConfig()
      setConfig(cfg)
    } catch (err) {
      toast(`Failed to load config: ${err}`, 'error')
    }
  }

  useEffect(() => { void load() }, [])

  async function handleSave(updates: Partial<GlobalConfig>) {
    try {
      const updated = await window.aide.updateConfig(updates)
      setConfig(updated)
      toast('Settings saved', 'success')
    } catch (err) {
      toast(`Failed to save: ${err}`, 'error')
    }
  }

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'discovery', label: 'Discovery' },
    { key: 'variables', label: 'Variables' },
  ]

  return (
    <div className="page active" style={{ display: 'flex' }}>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-desc">Global configuration (~/.aide/config.json)</div>
      </div>
      <div className="settings-tabs">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className={`settings-tab${activeTab === key ? ' active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="page-content">
        {config === null ? (
          <div className="empty"><span className="empty-icon">⏳</span>Loading...</div>
        ) : (
          <>
            {activeTab === 'general' && (
              <div className="card">
                <div className="list-body">
                  <GeneralTab config={config} onSave={handleSave} />
                </div>
              </div>
            )}
            {activeTab === 'discovery' && (
              <DiscoveryTab config={config} onSave={handleSave} />
            )}
            {activeTab === 'variables' && (
              <VariablesTab config={config} onSave={handleSave} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
