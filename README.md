# Aide — AI Mod Manager

Centralized manager for AI context mods. Install, sync, and inject AI personas (Agents), capabilities (Skills), and project documentation (`CLAUDE.md`, `AGENTS.md`) across all your development environments from a single source of truth at `~/.aide/`.

## Interfaces

| Interface | Use case |
|---|---|
| **CLI** (`aide`) | Day-to-day management, CI/CD |
| **VS Code Extension** | Real-time injection, workspace monitoring |
| **Electron App** | Visual marketplace and template editor |

All three share the same core logic via `@aide/core`.

## Quick Start

```sh
# Install dependencies
npm install

# Build all packages
npm run build

# Link the CLI globally
cd packages/cli && npm link

# Initialize ~/.aide with default templates
aide init
```

## CLI Commands

```sh
aide init                          # Set up ~/.aide with default templates
aide add <file> -t agent|skill|template  # Add a mod from a local file
aide remove <id>                   # Remove a mod from global storage
aide apply [template]              # Inject a template into the current directory
aide list                          # Show installed mods and local context status
aide link [path]                   # Link a project for template propagation
aide unlink [path]                 # Unlink a project (files are left in place)
aide sync [template]               # Propagate template changes to linked projects
```

### Variable Injection

Templates support Handlebars-style variables:

```sh
aide apply CLAUDE.md --var tech_stack="TypeScript, React" --var author="joao"
```

Built-in variables resolved automatically: `{{project_name}}`, `{{date}}`, `{{aide_version}}`, `{{tech_stack}}` (auto-detected from `package.json`).

## How It Works

### `~/.aide/` Directory

```
~/.aide/
├── agents/        # System prompts and personas (.md, .json)
├── skills/        # Executable scripts and tool definitions
├── templates/     # Master context files (CLAUDE.md, AGENTS.md, .cursorrules)
├── registry.json  # Installed mods, versions, linked projects
└── config.json    # Global settings
```

### Conflict Resolution

When applying a template to a project that already has the target file, Aide uses comment tags to manage its section without touching user content:

```markdown
# My own project notes (never touched by Aide)

<!-- AIDE:START id="CLAUDE.md" version="1" -->
# AI Assistant Context
...managed content...
<!-- AIDE:END id="CLAUDE.md" -->

## My own section below (also never touched)
```

Four merge cases:
1. **File doesn't exist** → creates the file with AIDE tags
2. **File exists, no tags** → appends managed section; prompts for confirmation
3. **File exists, matching tags** → replaces the managed section in-place; shows diff
4. **File exists, other tags** → appends a new section alongside the existing ones

### Linking

```sh
# Link the current project — stores variables for propagation
aide link --var project_name="myapp" --var tech_stack="TypeScript, React"

# Later, when you update a template in ~/.aide/templates/:
aide sync
```

Linked project paths and variables are stored in `registry.json`. When templates change, `sync` re-renders them with each project's stored variables and merges in-place. The VS Code extension does this automatically on file save.

Projects remain functional without Aide — context files are plain Markdown.

## Development

```sh
npm install          # Install all workspace dependencies
npm run build        # Build all packages
npm test             # Run all tests (vitest)
npm run typecheck    # TypeScript type checking
```

### Package Structure

```
packages/
├── core/      # @aide/core — all business logic (no UI deps)
├── cli/       # @aide/cli  — Ink/React terminal UI + Commander
├── vscode/    # @aide/vscode — VS Code extension (bundles core)
└── electron/  # @aide/electron — Electron desktop app
```

### VS Code Extension

Open the `packages/vscode` folder in VS Code and press `F5` to launch an Extension Development Host.

### Electron App

```sh
cd packages/electron
npm run build
npx electron .
```

## Configuration (`~/.aide/config.json`)

| Key | Default | Description |
|---|---|---|
| `auto_propagate` | `true` | Auto-propagate template changes to linked projects |
| `confirm_before_write` | `true` | Prompt before writing files outside `~/.aide/` |
| `default_variables` | `{}` | Variables applied to all template renders |
| `skill_allow_list` | `[]` | Allowed skill IDs (empty = all allowed) |
| `registry_url` | `null` | Remote registry URL for `aide add <name>` |

## License

MIT
