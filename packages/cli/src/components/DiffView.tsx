import React from 'react'
import { Box, Text } from 'ink'

interface DiffViewProps {
  diff: string
  title?: string
}

export function DiffView({ diff, title }: DiffViewProps) {
  const lines = diff.split('\n')

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      {title && (
        <Text bold color="yellow">
          {title}
        </Text>
      )}
      {lines.map((line, i) => {
        const prefix = line.slice(0, 2)
        const rest = line.slice(2)
        if (prefix === '+ ') {
          return (
            <Text key={i} color="green">
              {line}
            </Text>
          )
        }
        if (prefix === '- ') {
          return (
            <Text key={i} color="red">
              {line}
            </Text>
          )
        }
        return (
          <Text key={i} dimColor>
            {line}
          </Text>
        )
      })}
    </Box>
  )
}
