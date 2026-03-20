import React from 'react'
import { Box, Text } from 'ink'
import type { InstalledMod } from '@aide/core'

interface ModsTableProps {
  mods: InstalledMod[]
}

export function ModsTable({ mods }: ModsTableProps) {
  if (mods.length === 0) {
    return <Text dimColor>No mods installed. Run `aide add` to get started.</Text>
  }

  const TYPE_COLORS: Record<string, string> = {
    agent: 'magenta',
    skill: 'cyan',
    template: 'blue',
  }

  return (
    <Box flexDirection="column">
      <Box gap={2}>
        <Text bold underline color="white" minWidth={20}>ID</Text>
        <Text bold underline color="white" minWidth={10}>TYPE</Text>
        <Text bold underline color="white" minWidth={10}>VERSION</Text>
        <Text bold underline color="white">SOURCE</Text>
      </Box>
      {mods.map((mod) => (
        <Box key={mod.id} gap={2}>
          <Text minWidth={20}>{mod.id}</Text>
          <Text color={TYPE_COLORS[mod.type] ?? 'white'} minWidth={10}>{mod.type}</Text>
          <Text minWidth={10} dimColor>{mod.version}</Text>
          <Text dimColor>{mod.source}</Text>
        </Box>
      ))}
    </Box>
  )
}
