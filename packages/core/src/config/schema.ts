import { z } from 'zod'

const TypedDirSchema = z.object({
  rel: z.string(),
  type: z.enum(['skill', 'agent']),
})

const ScanRootSchema = z.object({
  rel: z.string(),
  depth: z.number().int().min(0).max(10),
})

export const SkillRepositorySchema = z.object({
  owner: z.string(),
  repo: z.string(),
  path: z.string().default('skills'),
})

export const GlobalConfigSchema = z.object({
  version: z.literal('1'),
  auto_propagate: z.boolean().default(true),
  confirm_before_write: z.boolean().default(true),
  default_variables: z.record(z.string()).default({}),
  skill_allow_list: z.array(z.string()).default([]),
  registry_url: z.string().url().nullable().default(null),

  // Discovery configuration
  skill_dirs: z.array(TypedDirSchema).default([
    { rel: '.codex/skills',    type: 'skill' },
    { rel: '.claude/skills',   type: 'skill' },
    { rel: '.opencode/skills', type: 'skill' },
    { rel: '.cursor/tools',    type: 'skill' },
    { rel: '.aider/scripts',   type: 'skill' },
    { rel: '.continue/tools',  type: 'skill' },
  ]),
  agent_dirs: z.array(TypedDirSchema).default([
    { rel: '.codex/agents',     type: 'agent' },
    { rel: '.claude/agents',    type: 'agent' },
    { rel: '.opencode/agents',  type: 'agent' },
    { rel: '.cursor/rules',     type: 'agent' },
    { rel: '.aider/prompts',    type: 'agent' },
    { rel: '.continue/prompts', type: 'agent' },
  ]),
  template_scan_roots: z.array(ScanRootSchema).default([
    { rel: '.',         depth: 0 },
    { rel: '.github',   depth: 1 },
    { rel: '.claude',   depth: 1 },
    { rel: '.cursor',   depth: 1 },
    { rel: '.codex',    depth: 1 },
    { rel: '.opencode', depth: 1 },
    { rel: 'Projects',  depth: 3 },
    { rel: 'projects',  depth: 3 },
    { rel: 'dev',       depth: 3 },
    { rel: 'code',      depth: 3 },
    { rel: 'workspace', depth: 3 },
    { rel: 'Documents', depth: 2 },
    { rel: 'src',       depth: 3 },
  ]),
  template_names: z.array(z.string()).default([
    'CLAUDE.md', 'AGENTS.md', '.cursorrules', 'copilot-instructions.md',
  ]),
  skip_dirs: z.array(z.string()).default([
    'node_modules', '.git', 'dist', 'build', '.next', '.cache',
    '__pycache__', 'vendor', '.npm', '.yarn', '.pnpm',
    'target', 'out', '.svelte-kit', 'coverage', 'tmp',
  ]),
  skill_repositories: z.array(SkillRepositorySchema).default([
    { owner: 'anthropics', repo: 'skills', path: 'skills' },
  ]),
})

export type GlobalConfig = z.infer<typeof GlobalConfigSchema>
export type TypedDir = z.infer<typeof TypedDirSchema>
export type ScanRoot = z.infer<typeof ScanRootSchema>
export type SkillRepository = z.infer<typeof SkillRepositorySchema>

export const DEFAULT_CONFIG: GlobalConfig = {
  version: '1',
  auto_propagate: true,
  confirm_before_write: true,
  default_variables: {},
  skill_allow_list: [],
  registry_url: null,
  skill_dirs: [
    { rel: '.codex/skills',    type: 'skill' },
    { rel: '.claude/skills',   type: 'skill' },
    { rel: '.opencode/skills', type: 'skill' },
    { rel: '.cursor/tools',    type: 'skill' },
    { rel: '.aider/scripts',   type: 'skill' },
    { rel: '.continue/tools',  type: 'skill' },
  ],
  agent_dirs: [
    { rel: '.codex/agents',     type: 'agent' },
    { rel: '.claude/agents',    type: 'agent' },
    { rel: '.opencode/agents',  type: 'agent' },
    { rel: '.cursor/rules',     type: 'agent' },
    { rel: '.aider/prompts',    type: 'agent' },
    { rel: '.continue/prompts', type: 'agent' },
  ],
  template_scan_roots: [
    { rel: '.',         depth: 0 },
    { rel: '.github',   depth: 1 },
    { rel: '.claude',   depth: 1 },
    { rel: '.cursor',   depth: 1 },
    { rel: '.codex',    depth: 1 },
    { rel: '.opencode', depth: 1 },
    { rel: 'Projects',  depth: 3 },
    { rel: 'projects',  depth: 3 },
    { rel: 'dev',       depth: 3 },
    { rel: 'code',      depth: 3 },
    { rel: 'workspace', depth: 3 },
    { rel: 'Documents', depth: 2 },
    { rel: 'src',       depth: 3 },
  ],
  template_names: ['CLAUDE.md', 'AGENTS.md', '.cursorrules', 'copilot-instructions.md'],
  skip_dirs: [
    'node_modules', '.git', 'dist', 'build', '.next', '.cache',
    '__pycache__', 'vendor', '.npm', '.yarn', '.pnpm',
    'target', 'out', '.svelte-kit', 'coverage', 'tmp',
  ],
  skill_repositories: [
    { owner: 'anthropics', repo: 'skills', path: 'skills' },
  ],
}
