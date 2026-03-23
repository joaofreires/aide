import { useState } from 'react'
import type { GlobalConfig } from '@aide/core'

interface DiscoveryTabProps {
  config: GlobalConfig
  onSave: (updates: Partial<GlobalConfig>) => Promise<void>
}

export function DiscoveryTab({ config, onSave }: DiscoveryTabProps) {
  const [skillDirInput, setSkillDirInput] = useState('')
  const [skipDirInput, setSkipDirInput] = useState('')

  async function addSkillDir() {
    const rel = skillDirInput.trim()
    if (!rel) return
    await onSave({ skill_dirs: [...config.skill_dirs, { rel, type: 'skill' }] })
    setSkillDirInput('')
  }

  async function addSkipDir() {
    const name = skipDirInput.trim()
    if (!name) return
    if (config.skip_dirs.includes(name)) return
    await onSave({ skip_dirs: [...config.skip_dirs, name] })
    setSkipDirInput('')
  }

  return (
    <>
      {/* Skill Directories */}
      <div className="card">
        <div className="card-header"><span className="card-title">Skill Directories</span></div>
        <div className="list-body">
          {config.skill_dirs.length === 0 ? (
            <div className="empty" style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'left' }}>None configured</div>
          ) : (
            config.skill_dirs.map((d, i) => (
              <div key={i} className="list-item">
                <span className="list-item-label">~/{d.rel}</span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { void onSave({ skill_dirs: config.skill_dirs.filter((_, j) => j !== i) }) }}
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
              <label>Relative path from ~/ (e.g. .claude/skills)</label>
              <input
                type="text"
                value={skillDirInput}
                onChange={e => setSkillDirInput(e.target.value)}
                placeholder=".claude/skills"
                onKeyDown={e => { if (e.key === 'Enter') void addSkillDir() }}
              />
            </div>
            <button className="btn btn-secondary" onClick={() => { void addSkillDir() }}>Add</button>
          </div>
        </div>
      </div>

      {/* Skip Directories */}
      <div className="card">
        <div className="card-header"><span className="card-title">Skip Directories</span></div>
        <div className="list-body">
          {config.skip_dirs.length === 0 ? (
            <div className="empty" style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'left' }}>None configured</div>
          ) : (
            config.skip_dirs.map((name, i) => (
              <div key={i} className="list-item">
                <span className="list-item-label">{name}</span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { void onSave({ skip_dirs: config.skip_dirs.filter((_, j) => j !== i) }) }}
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
              <label>Directory name to skip during scans</label>
              <input
                type="text"
                value={skipDirInput}
                onChange={e => setSkipDirInput(e.target.value)}
                placeholder="node_modules"
                onKeyDown={e => { if (e.key === 'Enter') void addSkipDir() }}
              />
            </div>
            <button className="btn btn-secondary" onClick={() => { void addSkipDir() }}>Add</button>
          </div>
        </div>
      </div>
    </>
  )
}
