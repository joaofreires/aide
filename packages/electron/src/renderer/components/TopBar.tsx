interface TopBarProps {
  onLinkProject: () => void
}

export function TopBar({ onLinkProject }: TopBarProps) {
  return (
    <div id="topbar">
      <button className="btn btn-primary btn-sm" onClick={onLinkProject}>
        + Link Project
      </button>
    </div>
  )
}
