import { useState, useEffect, useRef, useCallback } from 'react'
import type { LinkedProject, InstalledMod } from '@aide/core'
import type { Page } from '../App.js'

interface ProjectMapPageProps {
  onNavigate: (page: Page, path?: string) => void
}

interface MapNode {
  id: string
  label: string
  sublabel: string
  x: number
  y: number
  radius: number
  type: 'center' | 'project'
  templates: string[]
  path?: string
  skillCount?: number
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  title: string
  path: string
  templates: string[]
}

export function ProjectMapPage({ onNavigate }: ProjectMapPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animFrame = useRef<number>(0)
  const [nodes, setNodes] = useState<MapNode[]>([])
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, title: '', path: '', templates: [],
  })
  const [stats, setStats] = useState({ projects: 0, templates: 0, skills: 0 })
  const flowOffset = useRef(0)

  // Load project data
  useEffect(() => {
    async function load() {
      try {
        const registry = await window.aide.readRegistry()
        const projects = Object.values(registry.linked_projects) as LinkedProject[]
        const mods = Object.values(registry.mods) as InstalledMod[]

        setStats({
          projects: projects.length,
          templates: mods.filter(m => m.type === 'template').length,
          skills: mods.filter(m => m.type === 'skill').length,
        })

        // Build nodes
        const mapNodes: MapNode[] = []

        // Center node
        mapNodes.push({
          id: 'center',
          label: '~/.aide',
          sublabel: `${mods.length} mods`,
          x: 0, y: 0,
          radius: 42,
          type: 'center',
          templates: [],
        })

        // Project nodes positioned in a circle
        const count = projects.length
        projects.forEach((project, i) => {
          const angle = (2 * Math.PI * i / count) - Math.PI / 2
          const dist = 180 + Math.min(count * 12, 100)
          const name = project.project_path.split('/').pop() ?? project.project_path

          mapNodes.push({
            id: project.project_path,
            label: name,
            sublabel: `${project.applied_templates.length} templates`,
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            radius: 32,
            type: 'project',
            templates: project.applied_templates,
            path: project.project_path,
          })
        })

        setNodes(mapNodes)
      } catch {
        // silently fail
      }
    }
    void load()
  }, [])

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const cx = rect.width / 2
    const cy = rect.height / 2

    // Background ambient glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300)
    glow.addColorStop(0, 'rgba(88, 166, 255, 0.03)')
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, rect.width, rect.height)

    const centerNode = nodes.find(n => n.type === 'center')
    if (!centerNode) return

    const projectNodes = nodes.filter(n => n.type === 'project')
    flowOffset.current = (flowOffset.current + 0.003) % 1

    // Draw connections
    for (const pNode of projectNodes) {
      const fromX = cx + centerNode.x
      const fromY = cy + centerNode.y
      const toX = cx + pNode.x
      const toY = cy + pNode.y

      // Gradient line
      const lineGrad = ctx.createLinearGradient(fromX, fromY, toX, toY)
      lineGrad.addColorStop(0, 'rgba(88, 166, 255, 0.3)')
      lineGrad.addColorStop(0.5, 'rgba(48, 227, 179, 0.2)')
      lineGrad.addColorStop(1, 'rgba(88, 166, 255, 0.08)')

      ctx.beginPath()
      ctx.moveTo(fromX, fromY)
      ctx.lineTo(toX, toY)
      ctx.strokeStyle = lineGrad
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Flowing dot
      const t = (flowOffset.current + projectNodes.indexOf(pNode) * 0.15) % 1
      const dotX = fromX + (toX - fromX) * t
      const dotY = fromY + (toY - fromY) * t
      const dotGlow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 6)
      dotGlow.addColorStop(0, 'rgba(48, 227, 179, 0.6)')
      dotGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = dotGlow
      ctx.fillRect(dotX - 6, dotY - 6, 12, 12)

      // Template labels on connections
      if (pNode.templates.length > 0) {
        const midX = (fromX + toX) / 2
        const midY = (fromY + toY) / 2
        ctx.font = '600 9px Inter, sans-serif'
        ctx.fillStyle = 'rgba(88, 166, 255, 0.5)'
        ctx.textAlign = 'center'
        const label = pNode.templates.length <= 2
          ? pNode.templates.join(', ')
          : `${pNode.templates[0]}, +${pNode.templates.length - 1}`
        ctx.fillText(label, midX, midY - 6)
      }
    }

    // Draw center node
    {
      const x = cx + centerNode.x
      const y = cy + centerNode.y
      const r = centerNode.radius

      // Glow
      const ng = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2)
      ng.addColorStop(0, 'rgba(88, 166, 255, 0.08)')
      ng.addColorStop(1, 'transparent')
      ctx.fillStyle = ng
      ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4)

      // Circle
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
      grad.addColorStop(0, 'rgba(88, 166, 255, 0.15)')
      grad.addColorStop(1, 'rgba(48, 227, 179, 0.1)')
      ctx.fillStyle = grad
      ctx.fill()
      ctx.strokeStyle = 'rgba(88, 166, 255, 0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Label
      ctx.font = '700 13px Inter, sans-serif'
      ctx.fillStyle = '#e6edf3'
      ctx.textAlign = 'center'
      ctx.fillText(centerNode.label, x, y - 2)
      ctx.font = '500 10px Inter, sans-serif'
      ctx.fillStyle = '#7d8590'
      ctx.fillText(centerNode.sublabel, x, y + 13)
    }

    // Draw project nodes
    for (const pNode of projectNodes) {
      const x = cx + pNode.x
      const y = cy + pNode.y
      const r = pNode.radius

      // Circle
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(18, 24, 34, 0.9)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Label
      ctx.font = '600 11px Inter, sans-serif'
      ctx.fillStyle = '#e6edf3'
      ctx.textAlign = 'center'
      const displayLabel = pNode.label.length > 12
        ? pNode.label.slice(0, 11) + '…'
        : pNode.label
      ctx.fillText(displayLabel, x, y + 1)
      ctx.font = '500 9px Inter, sans-serif'
      ctx.fillStyle = '#7d8590'
      ctx.fillText(pNode.sublabel, x, y + 13)
    }

    animFrame.current = requestAnimationFrame(draw)
  }, [nodes])

  // Start animation loop
  useEffect(() => {
    if (nodes.length === 0) return

    animFrame.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame.current)
  }, [nodes, draw])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      // next frame will pick up new size
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Mouse interactions
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2

    let found = false
    for (const node of nodes) {
      if (node.type === 'center') continue
      const nx = cx + node.x
      const ny = cy + node.y
      const dist = Math.sqrt((mx - nx) ** 2 + (my - ny) ** 2)

      if (dist <= node.radius) {
        canvas.style.cursor = 'pointer'
        setTooltip({
          visible: true,
          x: e.clientX - rect.left + 16,
          y: e.clientY - rect.top - 10,
          title: node.label,
          path: node.path ?? '',
          templates: node.templates,
        })
        found = true
        break
      }
    }

    if (!found) {
      canvas.style.cursor = 'default'
      setTooltip(prev => ({ ...prev, visible: false }))
    }
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2

    for (const node of nodes) {
      if (node.type === 'center') continue
      const nx = cx + node.x
      const ny = cy + node.y
      const dist = Math.sqrt((mx - nx) ** 2 + (my - ny) ** 2)

      if (dist <= node.radius && node.path) {
        onNavigate('project-detail', node.path)
        return
      }
    }
  }

  return (
    <div className="page active" style={{ display: 'flex' }}>
      <div className="project-map-stats">
        <div className="project-map-stat">
          <span className="project-map-stat-value">{stats.projects}</span>
          <span className="project-map-stat-label">Projects</span>
        </div>
        <div className="project-map-stat">
          <span className="project-map-stat-value">{stats.templates}</span>
          <span className="project-map-stat-label">Templates</span>
        </div>
        <div className="project-map-stat">
          <span className="project-map-stat-value">{stats.skills}</span>
          <span className="project-map-stat-label">Skills</span>
        </div>
      </div>

      <div className="project-map-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="project-map-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
          onClick={handleClick}
        />

        {/* Tooltip */}
        <div
          className={`project-map-tooltip${tooltip.visible ? ' visible' : ''}`}
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <div className="project-map-tooltip-title">{tooltip.title}</div>
          <div className="project-map-tooltip-path">{tooltip.path}</div>
          {tooltip.templates.length > 0 && (
            <div className="project-map-tooltip-templates">
              {tooltip.templates.map(t => (
                <span key={t} className="project-global-pill">{t}</span>
              ))}
            </div>
          )}
        </div>

        {nodes.filter(n => n.type === 'project').length === 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div className="empty">
              <span className="empty-icon">🗺️</span>
              Link some projects to see them on the map.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
