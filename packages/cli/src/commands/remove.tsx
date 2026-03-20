import React, { useEffect, useState } from 'react'
import { Box, Text, useApp } from 'ink'
import { Spinner } from '@inkjs/ui'
import { remove } from '@aide/core'
import { StatusLine } from '../components/StatusLine.js'
import type { RemoveResult } from '@aide/core'

interface RemoveCommandProps {
  id: string
}

export function RemoveCommand({ id }: RemoveCommandProps) {
  const { exit } = useApp()
  const [result, setResult] = useState<RemoveResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    remove({ id })
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
  if (!result) return <Spinner label={`Removing ${id}...`} />

  return (
    <StatusLine type="success">
      Removed <Text bold>{result.id}</Text>
    </StatusLine>
  )
}
