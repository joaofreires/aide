import { access, constants } from 'node:fs/promises'
import { PermissionError } from '../errors/AideError.js'

/**
 * Checks if a file is executable. Throws PermissionError if not.
 */
export async function assertExecutable(filePath: string): Promise<void> {
  try {
    await access(filePath, constants.X_OK)
  } catch {
    throw new PermissionError(
      filePath,
      'File must be executable before it can be added as a skill. Run `chmod +x <file>` first.',
    )
  }
}

/**
 * Returns true if a file is readable.
 */
export async function isReadable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Returns true if a path is writable.
 */
export async function isWritable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.W_OK)
    return true
  } catch {
    return false
  }
}
