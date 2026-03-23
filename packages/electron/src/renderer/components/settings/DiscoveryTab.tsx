import { useState } from 'react'
import type { GlobalConfig } from '@aide/core'

interface DiscoveryTabProps {
  config: GlobalConfig
  onSave: (updates: Partial<GlobalConfig>) => Promise<void>
}

export function DiscoveryTab({ config, onSave }: DiscoveryTabProps) {
  const [skillDirInput, setSkillDirInput] = useState('')
  const [skipDirInput, setSkipDirInput] = useState('')
  const [repoInput, setRepoInput] = useState('')
  const [repoPathInput, setRepoPathInput] = useState('')

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

  async function addRepo() {
    const raw = repoInput.trim()
    if (!raw) return
    const parts = raw.split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return
    const owner = parts[0]
    const repo = parts[1]
    const path = repoPathInput.trim() || 'skills'
    const already = config.skill_repositories.find(r => r.owner === owner && r.repo === repo)
    if (already) return
    await onSave({ skill_repositories: [...config.skill_repositories, { owner, repo, path }] })
    setRepoInput('')
    setRepoPathInput('')
  }

  return (
    <>
      {/* Skill Repositories */}
      <div className="card">
        <div className="card-header"><span className="card-title">Skill Repositories</span></div>
        <div className="list-body">
          {config.skill_repositories.length === 0 ? (
            <div className="empty" style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'left' }}>None configured</div>
          ) : (
            config.skill_repositories.map((r, i) => (
              <div key={i} className="list-item">
                <span className="list-item-label">{r.owner}/{r.repo}{r.path !== 'skills' ? ` (${r.path})` : ''}</span>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { void onSave({ skill_repositories: config.skill_repositories.filter((_, j) => j !== i) }) }}
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
              <label>GitHub repo (owner/repo)</label>
              <input
                type="text"
                value={repoInput}
                onChange={e => setRepoInput(e.target.value)}
                placeholder="anthropics/skills"
                onKeyDown={e => { if (e.key === 'Enter') void addRepo() }}
              />
            </div>
            <div className="form-group">
              <label>Skills path</label>
              <input
                type="text"
                value={repoPathInput}
                onChange={e => setRepoPathInput(e.target.value)}
                placeholder="skills"
                style={{ width: '100px' }}
                onKeyDown={e => { if (e.key === 'Enter') void addRepo() }}
              />
            </div>
            <button className="btn btn-secondary" onClick={() => { void addRepo() }}>Add</button>
          </div>
        </div>
      </div>

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
