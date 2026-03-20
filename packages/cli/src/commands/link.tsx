import React, { useEffect, useState } from 'react'
import { Box, Text, useApp } from 'ink'
import { Spinner } from '@inkjs/ui'
import { link } from '@aide/core'
import { StatusLine } from '../components/StatusLine.js'
import type { LinkResult } from '@aide/core'

interface LinkCommandProps {
  projectPath: string
  variables: Record<string, string>
}

export function LinkCommand({ projectPath, variables }: LinkCommandProps) {
  const { exit } = useApp()
  const [result, setResult] = useState<LinkResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    link({ projectPath, variables })
      .then((r) => {
        setResult(r)
        exit()
      })
      .catch((err: unknown) => {
        setError(String(err))
        exit()
      })
  }, [])

  if (error) return <StatusLine type="error">{error}</StatusLine>
  if (!result) return <Spinner label={`Linking ${projectPath}...`} />

  return (
    <Box flexDirection="column">
      <StatusLine type={result.already_linked ? 'info' : 'success'}>
        {result.already_linked ? 'Updated link for' : 'Linked'}{' '}
        <Text bold>{result.projectPath}</Text>
      </StatusLine>
      {Object.keys(result.variables).length > 0 && (
        <Box flexDirection="column" marginLeft={2}>
          <Text dimColor>Variables:</Text>
          {Object.entries(result.variables).map(([k, v]) => (
            <Text key={k} dimColor>  {k} = {v}</Text>
          ))}
        </Box>
      )}
    </Box>
  )
}
