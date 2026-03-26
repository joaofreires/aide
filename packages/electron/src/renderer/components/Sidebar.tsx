import type { Page } from '../App.js'

interface SidebarProps {
  activePage: Page
  onNavigate: (page: Page) => void
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <div id="sidebar">
      <div className="logo">
        <div className="logo-row">
          <img className="logo-mark" src="icon.svg" alt="" />
          <div>
            <div className="logo-title">Aide</div>
            <div className="logo-sub">AI Mod Manager</div>
          </div>
        </div>
      </div>
      <nav>
        <div className="nav-section">Library</div>
        <button
          className={`nav-btn${activePage === 'mods' ? ' active' : ''}`}
          onClick={() => onNavigate('mods')}
        >
          <span className="nav-icon">📦</span> Skills
        </button>
        <button
          className={`nav-btn${activePage === 'discover' ? ' active' : ''}`}
          onClick={() => onNavigate('discover')}
        >
          <span className="nav-icon">🔍</span> Discover
        </button>
        <div className="nav-section">Workspace</div>
        <button
          className={`nav-btn${activePage === 'projects' ? ' active' : ''}`}
          onClick={() => onNavigate('projects')}
        >
          <span className="nav-icon">🔗</span> Projects
        </button>
        <button
          className={`nav-btn${activePage === 'settings' ? ' active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <span className="nav-icon">⚙️</span> Settings
        </button>
      </nav>
    </div>
  )
}
