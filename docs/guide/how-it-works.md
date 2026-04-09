# How It Works

## `~/.aide/` Directory

```
~/.aide/
├── agents/        # System prompts and personas (.md, .json)
├── skills/        # Executable scripts and tool definitions
├── templates/     # Master context files (CLAUDE.md, AGENTS.md, .cursorrules)
├── registry.json  # Installed mods, versions, linked projects
└── config.json    # Global settings
```

## Conflict Resolution

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

## Linking

```sh
# Link the current project — stores variables for propagation
aide link --var project_name="myapp" --var tech_stack="TypeScript, React"

# Later, when you update a template in ~/.aide/templates/:
aide sync
```

Linked project paths and variables are stored in `registry.json`. When templates change, `sync` re-renders them with each project's stored variables and merges in-place. The VS Code extension does this automatically on file save.

Projects remain functional without Aide — context files are plain Markdown.
