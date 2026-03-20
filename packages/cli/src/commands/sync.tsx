import React, { useEffect, useState } from 'react'
import { Box, Text, useApp } from 'ink'
import { Spinner } from '@inkjs/ui'
import { propagate } from '@aide/core'
import { StatusLine } from '../components/StatusLine.js'
import type { PropagateResult } from '@aide/core'

interface SyncCommandProps {
  templateName?: string
}

export function SyncCommand({ templateName }: SyncCommandProps) {
  const { exit } = useApp()
  const [result, setResult] = useState<PropagateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    propagate({ templateName })
      .then((r) => {
        setResult(r)
        exit()
      })
      .catch((err: unknown) => {
        setError(String(err))
        exit()
      })
  }, [])

  const label = templateName ? `Syncing template "${templateName}"...` : 'Syncing all templates...'

  if (error) return <StatusLine type="error">{error}</StatusLine>
  if (!result) return <Spinner label={label} />

  const changed = result.propagated.filter((p) => p.action !== 'skipped')

  return (
    <Box flexDirection="column" gap={1}>
      {changed.length === 0 && result.skipped.length === 0 ? (
        <StatusLine type="info">Nothing to sync — no linked projects.</StatusLine>
      ) : (
        <>
          {changed.length > 0 && (
            <Box flexDirection="column">
              <StatusLine type="success">Synced {changed.length} file(s)</StatusLine>
              {changed.map((p, i) => (
                <Text key={i} dimColor>  {p.action}: {p.projectPath}/{p.templateName}</Text>
              ))}
            </Box>
          )}
          {result.skipped.length > 0 && (
            <Box flexDirection="column">
              <StatusLine type="warn">Skipped {result.skipped.length} file(s)</StatusLine>
              {result.skipped.map((p, i) => (
                <Text key={i} dimColor>  {p.projectPath}/{p.templateName}: {p.reason}</Text>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
