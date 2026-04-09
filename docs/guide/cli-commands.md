# CLI Commands

The Command Line Interface is used for day-to-day management and CI/CD.

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

## Variable Injection

Templates support Handlebars-style variables:

```sh
aide apply CLAUDE.md --var tech_stack="TypeScript, React" --var author="joao"
```

Built-in variables resolved automatically: `{{project_name}}`, `{{date}}`, `{{aide_version}}`, `{{tech_stack}}` (auto-detected from `package.json`).
