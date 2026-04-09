# Configuration

Configuration is stored in `~/.aide/config.json`.

| Key | Default | Description |
|---|---|---|
| `auto_propagate` | `true` | Auto-propagate template changes to linked projects |
| `confirm_before_write` | `true` | Prompt before writing files outside `~/.aide/` |
| `default_variables` | `{}` | Variables applied to all template renders |
| `skill_allow_list` | `[]` | Allowed skill IDs (empty = all allowed) |
| `registry_url` | `null` | Remote registry URL for `aide add <name>` |
