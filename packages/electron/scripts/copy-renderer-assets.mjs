import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = resolve(rootDir, 'dist/renderer')
const fontsDir = resolve(outputDir, 'fonts')

await mkdir(outputDir, { recursive: true })
await mkdir(fontsDir, { recursive: true })

for (const file of ['src/renderer/index.html', 'src/renderer/styles.css', 'assets/icon.png', 'assets/icon.svg']) {
  const source = resolve(rootDir, file)
  const destination = resolve(outputDir, file.split('/').at(-1))
  await copyFile(source, destination)
}

// Copy font files
for (const file of [
  'assets/fonts/inter-v18-latin.woff2',
  'assets/fonts/inter-v18-latin-500.woff2',
  'assets/fonts/inter-v18-latin-600.woff2',
  'assets/fonts/inter-v18-latin-700.woff2',
]) {
  const source = resolve(rootDir, file)
  const destination = resolve(fontsDir, file.split('/').at(-1))
  await copyFile(source, destination)
}
