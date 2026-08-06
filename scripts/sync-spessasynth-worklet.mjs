import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const expectedVersions = {
  spessasynth_lib: '4.3.12',
  spessasynth_core: '4.3.16',
}

for (const [packageName, expectedVersion] of Object.entries(expectedVersions)) {
  const packageJson = JSON.parse(
    await readFile(
      resolve(repositoryRoot, 'node_modules', packageName, 'package.json'),
      'utf8',
    ),
  )
  if (packageJson.version !== expectedVersion) {
    throw new Error(
      `${packageName} ${packageJson.version} does not match tested version ${expectedVersion}.`,
    )
  }
}

const source = resolve(
  repositoryRoot,
  'node_modules/spessasynth_lib/dist/spessasynth_processor.min.js',
)
const destination = resolve(
  repositoryRoot,
  'public/vendor/spessasynth_processor.min.js',
)

await mkdir(dirname(destination), { recursive: true })
await copyFile(source, destination)

const bytes = await readFile(destination)
const digest = createHash('sha256').update(bytes).digest('hex')
console.log(`Synced SpessaSynth AudioWorklet (${bytes.byteLength} bytes, ${digest}).`)
