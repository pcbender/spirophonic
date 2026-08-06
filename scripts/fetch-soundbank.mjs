import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Fetches the bundled General MIDI sound bank into `public/soundbanks/`.
 *
 * The bank is 38 MB and never changes, so it is downloaded once and cached on
 * disk rather than committed — a binary that size in git is paid for by every
 * clone, forever, and it is reproducible from its digest.
 *
 * The digest is the contract. A file already present and matching is left
 * alone; anything that does not match its declared SHA-256 is refused rather
 * than written, so a truncated download or a substituted file cannot end up
 * being served as the bank the app expects.
 *
 * A failed download is a warning, not an error. The app treats a missing
 * bundled bank as an ordinary state — every default Instrument is native, so
 * the build and the app both still work; only the bundled presets are absent.
 * Failing the build here would mean no offline build could ever succeed.
 */

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const bank = {
  url: 'https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf3',
  path: 'public/soundbanks/MuseScore_General.sf3',
  digest: '5b85b6c2c61d10b2b91cddd41efcce7b25cd31c8271d511c73afafbef20b6fa3',
  byteLength: 39_900_972,
}

const digestOf = (bytes) => createHash('sha256').update(bytes).digest('hex')

const existing = async (destination) => {
  try {
    return await readFile(destination)
  } catch {
    return null
  }
}

const destination = resolve(repositoryRoot, bank.path)
const held = await existing(destination)

if (held && digestOf(held) === bank.digest) {
  console.log(
    `Sound bank already present (${held.byteLength} bytes, ${bank.digest.slice(0, 12)}…).`,
  )
  process.exit(0)
}

if (held) {
  console.warn(
    'Cached sound bank does not match its digest; downloading it again.',
  )
}

console.log(`Fetching sound bank (${(bank.byteLength / 1_048_576).toFixed(0)} MB)…`)

try {
  const response = await fetch(bank.url)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const digest = digestOf(bytes)
  if (digest !== bank.digest) {
    throw new Error(
      `digest ${digest} does not match the expected ${bank.digest}`,
    )
  }

  // Written to a temporary name and renamed, so an interrupted run never
  // leaves a half-written file that looks like a bank.
  await mkdir(dirname(destination), { recursive: true })
  const pending = `${destination}.partial`
  await writeFile(pending, bytes)
  await rename(pending, destination)

  console.log(`Fetched sound bank (${bytes.byteLength} bytes, ${digest}).`)
} catch (error) {
  console.warn(
    `Could not fetch the bundled sound bank: ${
      error instanceof Error ? error.message : String(error)
    }`,
  )
  console.warn(
    'The app will run without it: native Instruments are unaffected, and the ' +
      'Sound banks panel will report the bundled bank as unavailable.',
  )
}
