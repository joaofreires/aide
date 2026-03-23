import type { SkillFrontmatter } from '@aide/core'

interface SkillDetailProps {
  frontmatter: SkillFrontmatter | null | undefined
}

export function SkillDetail({ frontmatter }: SkillDetailProps) {
  if (!frontmatter) {
    return <span className="skill-detail-empty">No SKILL.md frontmatter found.</span>
  }

  const rows: { label: string; value: string }[] = []
  if (frontmatter.name) rows.push({ label: 'Name', value: frontmatter.name })
  if (frontmatter.description) rows.push({ label: 'Description', value: frontmatter.description })
  if (frontmatter.license) rows.push({ label: 'License', value: frontmatter.license })
  if (frontmatter.compatibility) rows.push({ label: 'Compatibility', value: frontmatter.compatibility })
  if (frontmatter.allowed_tools) rows.push({ label: 'Allowed tools', value: frontmatter.allowed_tools })
  if (frontmatter.metadata) {
    const entries = Object.entries(frontmatter.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')
    rows.push({ label: 'Metadata', value: entries })
  }

  if (rows.length === 0) {
    return <span className="skill-detail-empty">No frontmatter fields found.</span>
  }

  return (
    <>
      {rows.map(({ label, value }) => (
        <div key={label} className="skill-detail-row">
          <span className="skill-detail-label">{label}</span>
          <span className="skill-detail-value">{value}</span>
        </div>
      ))}
    </>
  )
}
