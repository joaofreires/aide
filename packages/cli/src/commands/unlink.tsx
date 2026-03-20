import React, { useEffect, useState } from 'react'
import { Text, useApp } from 'ink'
import { Spinner } from '@inkjs/ui'
import { unlink } from '@aide/core'
import { StatusLine } from '../components/StatusLine.js'
import type { UnlinkResult } from '@aide/core'

interface UnlinkCommandProps {
  projectPath: string
}

export function UnlinkCommand({ projectPath }: UnlinkCommandProps) {
  const { exit } = useApp()
  const [result, setResult] = useState<UnlinkResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    unlink(projectPath)
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
  if (!result) return <Spinner label={`Unlinking ${projectPath}...`} />

  return (
    <StatusLine type="success">
      Unlinked <Text bold>{result.projectPath}</Text>
    </StatusLine>
  )
}
