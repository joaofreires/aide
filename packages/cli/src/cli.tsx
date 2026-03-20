import React from 'react'
import { render } from 'ink'
import { Command } from 'commander'
import { resolve } from 'node:path'
import { InitCommand } from './commands/init.js'
import { ApplyCommand } from './commands/apply.js'
import { ListCommand } from './commands/list.js'
import { AddCommand } from './commands/add.js'
import { RemoveCommand } from './commands/remove.js'
import { LinkCommand } from './commands/link.js'
import { UnlinkCommand } from './commands/unlink.js'
import { SyncCommand } from './commands/sync.js'
import type { ModType } from '@aide/core'

/** Parse key=value pairs from --var flags */
function collectVars(val: string, acc: Record<string, string>): Record<string, string> {
  const idx = val.indexOf('=')
  if (idx === -1) return acc
  const key = val.slice(0, idx)
  const value = val.slice(idx + 1)
  return { ...acc, [key]: value }
}

const program = new Command()
  .name('aide')
  .description('AI Mod Manager — manage AI context files across your projects')
  .version('0.1.0')

program
  .command('init')
  .description('Initialize ~/.aide with default templates and config')
  .action(() => {
    render(<InitCommand />)
  })

program
  .command('add <file>')
  .description('Add a local agent, skill, or template to your global ~/.aide library')
  .option('-t, --type <type>', 'mod type: agent | skill | template', 'agent')
  .option('--id <id>', 'override the mod ID (defaults to filename)')
  .option('--version <version>', 'mod version (defaults to 1.0.0)')
  .action((file: string, options: { type: string; id?: string; version?: string }) => {
    render(
      <AddCommand
        filePath={resolve(file)}
        type={options.type as ModType}
        id={options.id}
        version={options.version}
      />,
    )
  })

program
  .command('remove <id>')
  .description('Remove a mod from global storage')
  .action((id: string) => {
    render(<RemoveCommand id={id} />)
  })

program
  .command('apply [template]')
  .description('Inject a context template into the current directory (defaults to CLAUDE.md)')
  .option('--var <key=value>', 'override a template variable', collectVars, {})
  .option('--no-confirm', 'skip confirmation prompts')
  .action((template: string | undefined, options: { var: Record<string, string>; confirm: boolean }) => {
    render(
      <ApplyCommand
        templateName={template ?? 'CLAUDE.md'}
        projectPath={process.cwd()}
        variables={options.var}
        noConfirm={!options.confirm}
      />,
    )
  })

program
  .command('list')
  .description('Show installed mods and context file status for the current project')
  .action(() => {
    render(<ListCommand projectPath={process.cwd()} />)
  })

program
  .command('link [path]')
  .description('Link a project to Aide for template propagation')
  .option('--var <key=value>', 'set a template variable for this project', collectVars, {})
  .action((path: string | undefined, options: { var: Record<string, string> }) => {
    render(
      <LinkCommand
        projectPath={resolve(path ?? process.cwd())}
        variables={options.var}
      />,
    )
  })

program
  .command('unlink [path]')
  .description('Unlink a project (context files are left in place)')
  .action((path: string | undefined) => {
    render(<UnlinkCommand projectPath={resolve(path ?? process.cwd())} />)
  })

program
  .command('sync [template]')
  .description('Propagate template changes to all linked projects')
  .action((template: string | undefined) => {
    render(<SyncCommand templateName={template} />)
  })

program.parse()
