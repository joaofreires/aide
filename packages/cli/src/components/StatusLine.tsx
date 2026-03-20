import React from 'react'
import { Text } from 'ink'

interface StatusLineProps {
  type: 'success' | 'error' | 'info' | 'warn'
  children: React.ReactNode
}

const ICONS: Record<StatusLineProps['type'], string> = {
  success: '✔',
  error: '✖',
  info: 'ℹ',
  warn: '⚠',
}

const COLORS: Record<StatusLineProps['type'], string> = {
  success: 'green',
  error: 'red',
  info: 'cyan',
  warn: 'yellow',
}

export function StatusLine({ type, children }: StatusLineProps) {
  return (
    <Text color={COLORS[type]}>
      {ICONS[type]} {children}
    </Text>
  )
}
