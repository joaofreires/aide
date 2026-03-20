import React, { useEffect, useState } from 'react'
import { Box, Text, useApp } from 'ink'
import { Spinner } from '@inkjs/ui'
import { add } from '@aide/core'
import { StatusLine } from '../components/StatusLine.js'
import type { AddResult, ModType } from '@aide/core'

interface AddCommandProps {
  filePath: string
  type: ModType
  id?: string
  version?: string
}

export function AddCommand({ filePath, type, id, version }: AddCommandProps) {
  const { exit } = useApp()
  const [result, setResult] = useState<AddResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    add({ filePath, type, id, version })
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
  if (!result) return <Spinner label={`Adding ${type}: ${filePath}...`} />

  return (
    <Box flexDirection="column">
      <StatusLine type="success">
        Added {result.mod.type} <Text bold>{result.mod.id}</Text> → {result.destination}
      </StatusLine>
    </Box>
  )
}
