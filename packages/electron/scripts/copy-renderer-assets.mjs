import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = resolve(rootDir, 'dist/renderer')

await mkdir(outputDir, { recursive: true })

for (const file of ['src/renderer/index.html', 'src/renderer/styles.css', 'assets/icon.png', 'assets/icon.svg']) {
  const source = resolve(rootDir, file)
  const destination = resolve(outputDir, file.split('/').at(-1))
  await copyFile(source, destination)
}
