import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { Spinner } from '@inkjs/ui'
import { list } from '@aide/core'
import { ModsTable } from '../components/ModsTable.js'
import { StatusLine } from '../components/StatusLine.js'
import type { ListResult } from '@aide/core'

interface ListCommandProps {
  projectPath: string
}

export function ListCommand({ projectPath }: ListCommandProps) {
  const [result, setResult] = useState<ListResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    list({ projectPath })
      .then(setResult)
      .catch((err: unknown) => setError(String(err)))
  }, [])

  if (error) return <StatusLine type="error">{error}</StatusLine>
  if (!result) return <Spinner label="Loading mods..." />

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text bold>Global Skills</Text>
        <ModsTable mods={result.global_mods} />
      </Box>

      <Box flexDirection="column">
        <Text bold>
          Project Context{' '}
          <Text dimColor>({projectPath})</Text>
          {result.linked && <Text color="green"> [linked]</Text>}
        </Text>
        {result.local_status.length === 0 ? (
          <Text dimColor>No managed context files found in this project.</Text>
        ) : (
          result.local_status.map((s) => (
            <Box key={s.templateName} gap={1}>
              <Text color={s.hasAideTags ? 'green' : 'yellow'}>
                {s.hasAideTags ? '✔' : '○'} {s.templateName}
              </Text>
              {s.hasAideTags && (
                <Text dimColor>
                  (managed: {s.managedSections.join(', ')})
                </Text>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  )
}
