import React, { useEffect, useState } from 'react'
import { Box, Text, useApp } from 'ink'
import { Spinner, ConfirmInput } from '@inkjs/ui'
import { apply, writeApplyResult } from '@aide/core'
import { StatusLine } from '../components/StatusLine.js'
import { DiffView } from '../components/DiffView.js'
import type { ApplyResult } from '@aide/core'

interface ApplyCommandProps {
  templateName: string
  projectPath: string
  variables: Record<string, string>
  noConfirm: boolean
}

type Phase = 'loading' | 'confirm' | 'writing' | 'done' | 'error'

export function ApplyCommand({ templateName, projectPath, variables, noConfirm }: ApplyCommandProps) {
  const { exit } = useApp()
  const [phase, setPhase] = useState<Phase>('loading')
  const [result, setResult] = useState<ApplyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apply({ templateName, projectPath, variables })
      .then((r) => {
        setResult(r)
        if (r.requires_confirmation && !noConfirm) {
          setPhase('confirm')
        } else {
          setPhase('writing')
        }
      })
      .catch((err: unknown) => {
        setError(String(err))
        setPhase('error')
      })
  }, [])

  useEffect(() => {
    if (phase === 'writing' && result) {
      writeApplyResult(result)
        .then(() => {
          setPhase('done')
          exit()
        })
        .catch((err: unknown) => {
          setError(String(err))
          setPhase('error')
        })
    }
  }, [phase, result])

  if (phase === 'loading') return <Spinner label={`Rendering ${templateName}...`} />

  if (phase === 'error') return <StatusLine type="error">{error}</StatusLine>

  if (phase === 'confirm' && result) {
    return (
      <Box flexDirection="column" gap={1}>
        {result.conflict_diff && (
          <DiffView diff={result.conflict_diff} title={`Changes to ${templateName}`} />
        )}
        <ConfirmInput
          defaultChoice="confirm"
          onConfirm={() => setPhase('writing')}
          onCancel={() => {
            setPhase('done')
            exit()
          }}
        />
      </Box>
    )
  }

  if (phase === 'writing') return <Spinner label={`Writing ${result?.file}...`} />

  if (phase === 'done' && result) {
    const actionColor = result.action === 'created' ? 'green'
      : result.action === 'merged' ? 'yellow'
      : result.action === 'skipped' ? 'cyan'
      : 'blue'

    return (
      <Box flexDirection="column">
        <Text color={actionColor}>
          {result.action === 'created' && '✔ Created'}
          {result.action === 'merged' && '✔ Merged'}
          {result.action === 'appended' && '✔ Appended'}
          {result.action === 'skipped' && 'ℹ No changes'}
          {' '}{result.file}
        </Text>
      </Box>
    )
  }

  return null
}
