import { basename } from 'node:path'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export interface BuiltinVariableContext {
  projectPath: string
  aideVersion?: string
}

/**
 * Resolves built-in template variables from the project context.
 */
export async function resolveBuiltinVariables(
  ctx: BuiltinVariableContext,
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {
    project_name: basename(ctx.projectPath),
    date: new Date().toISOString().split('T')[0] ?? new Date().toISOString(),
    aide_version: ctx.aideVersion ?? '0.1.0',
    tech_stack: await detectTechStack(ctx.projectPath),
  }
  return vars
}

async function detectTechStack(projectPath: string): Promise<string> {
  const pkgPath = join(projectPath, 'package.json')
  if (!existsSync(pkgPath)) return ''

  try {
    const raw = await readFile(pkgPath, 'utf8')
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    }
    const detected: string[] = ['TypeScript']
    if ('react' in allDeps) detected.push('React')
    if ('next' in allDeps) detected.push('Next.js')
    if ('vue' in allDeps) detected.push('Vue')
    if ('svelte' in allDeps) detected.push('Svelte')
    if ('express' in allDeps || 'fastify' in allDeps || 'hono' in allDeps) detected.push('Node.js API')
    if ('prisma' in allDeps || '@prisma/client' in allDeps) detected.push('Prisma')
    return detected.join(', ')
  } catch {
    return ''
  }
}
