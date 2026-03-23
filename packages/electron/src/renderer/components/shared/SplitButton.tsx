import { useState, useEffect, useRef } from 'react'

export interface SplitButtonItem {
  label: string
  onClick: () => void
}

interface SplitButtonProps {
  mainLabel: string
  onMainClick: () => void
  items: SplitButtonItem[]
  variant?: 'secondary' | 'danger'
}

export function SplitButton({ mainLabel, onMainClick, items, variant = 'secondary' }: SplitButtonProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [open])

  const btnClass = `btn btn-${variant} btn-sm`

  return (
    <div className="split-dropdown-wrap" ref={wrapRef}>
      <div className="btn-split">
        <button
          className={`${btnClass} btn-split-main`}
          onClick={e => { e.stopPropagation(); onMainClick() }}
        >
          {mainLabel}
        </button>
        <button
          className={`${btnClass} btn-split-arrow`}
          aria-label="More options"
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        >
          ▾
        </button>
      </div>
      <div className={`split-dropdown${open ? ' open' : ''}`}>
        {items.map((item, i) => (
          <button
            key={i}
            className="split-dropdown-item"
            onClick={e => { e.stopPropagation(); setOpen(false); item.onClick() }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
