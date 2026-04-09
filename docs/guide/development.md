# Development

```sh
npm install          # Install all workspace dependencies
npm run build        # Build all packages
npm test             # Run all tests (vitest)
npm run typecheck    # TypeScript type checking
```

## Package Structure

```
packages/
├── core/      # @aide/core — all business logic (no UI deps)
├── cli/       # @aide/cli  — Ink/React terminal UI + Commander
├── vscode/    # @aide/vscode — VS Code extension (bundles core)
└── electron/  # @aide/electron — Electron desktop app
```

## VS Code Extension

Open the `packages/vscode` folder in VS Code and press `F5` to launch an Extension Development Host.

## Electron App

```sh
cd packages/electron
npm run build
npx electron .
```
