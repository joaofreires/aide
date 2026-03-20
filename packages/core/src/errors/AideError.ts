export class AideError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'AideError'
  }
}

export class CorruptRegistryError extends AideError {
  constructor(detail?: string) {
    super(
      `Registry file is corrupt or invalid.${detail ? ` ${detail}` : ''} Run \`aide repair\` to rebuild.`,
      'CORRUPT_REGISTRY',
    )
    this.name = 'CorruptRegistryError'
  }
}

export class CorruptConfigError extends AideError {
  constructor(detail?: string) {
    super(
      `Config file is corrupt or invalid.${detail ? ` ${detail}` : ''}`,
      'CORRUPT_CONFIG',
    )
    this.name = 'CorruptConfigError'
  }
}

export class ModNotFoundError extends AideError {
  constructor(id: string) {
    super(`Mod "${id}" not found in registry.`, 'MOD_NOT_FOUND')
    this.name = 'ModNotFoundError'
  }
}

export class ModAlreadyExistsError extends AideError {
  constructor(id: string) {
    super(`Mod "${id}" is already installed.`, 'MOD_ALREADY_EXISTS')
    this.name = 'ModAlreadyExistsError'
  }
}

export class PermissionError extends AideError {
  constructor(path: string, detail?: string) {
    super(
      `Permission denied for "${path}".${detail ? ` ${detail}` : ''}`,
      'PERMISSION_DENIED',
    )
    this.name = 'PermissionError'
  }
}

export class TemplateNotFoundError extends AideError {
  constructor(name: string) {
    super(`Template "${name}" not found in ~/.aide/templates/.`, 'TEMPLATE_NOT_FOUND')
    this.name = 'TemplateNotFoundError'
  }
}

export class ProjectNotLinkedError extends AideError {
  constructor(projectPath: string) {
    super(`Project "${projectPath}" is not linked. Run \`aide link\` first.`, 'PROJECT_NOT_LINKED')
    this.name = 'ProjectNotLinkedError'
  }
}
