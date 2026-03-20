import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { Spinner } from '@inkjs/ui'
import { init } from '@aide/core'
import { StatusLine } from '../components/StatusLine.js'
import type { InitResult } from '@aide/core'

export function InitCommand() {
  const [result, setResult] = useState<InitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    init()
      .then(setResult)
      .catch((err: unknown) => setError(String(err)))
  }, [])

  if (error) return <StatusLine type="error">Init failed: {error}</StatusLine>
  if (!result) return <Spinner label="Initializing ~/.aide..." />

  return (
    <Box flexDirection="column" gap={1}>
      {result.already_existed ? (
        <StatusLine type="info">~/.aide already exists — skipping re-init</StatusLine>
      ) : (
        <StatusLine type="success">Initialized ~/.aide at {result.aideDir}</StatusLine>
      )}
      {result.created_templates.length > 0 && (
        <Box flexDirection="column">
          <Text bold>Created default templates:</Text>
          {result.created_templates.map((t) => (
            <Text key={t} dimColor>  • {t}</Text>
          ))}
        </Box>
      )}
    </Box>
  )
}
