import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  documentationSources,
  generateDocumentation,
  renderDocumentationPage,
} from './build-docs.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { force: true, recursive: true }),
    ),
  )
})

const temporaryDocumentation = async () => {
  const root = await mkdtemp(join(tmpdir(), 'spirophonic-docs-'))
  temporaryDirectories.push(root)
  const sourceDirectory = join(root, 'docs')
  const outputDirectory = join(root, 'public', 'docs')
  await mkdir(sourceDirectory, { recursive: true })
  await Promise.all(
    documentationSources.map(({ source, title }) =>
      writeFile(
        join(sourceDirectory, source),
        `# ${title}\n\nCurrent source for ${source}.\n`,
      ),
    ),
  )
  return { sourceDirectory, outputDirectory }
}

describe('generated web documentation', () => {
  it('renders readable structures, stable anchors, and live document links', () => {
    const html = renderDocumentationPage({
      document: documentationSources.find(({ source }) => source === 'MANUAL.md'),
      markdown: `# Manual

## First sound

| Control | Effect |
|---|---|
| Play | Starts playback |

> Keep listening.

\`\`\`bash
npm run dev
\`\`\`

[Getting started](GETTING-STARTED.md)
[Design history](SOUND-AND-MIDI-DESIGN.md)
[Unsafe](javascript:alert(1))
`,
    })

    expect(html).toContain('<h2 id="first-sound">')
    expect(html).toContain('<table>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<code class="language-bash">')
    expect(html).toContain('href="getting-started.html"')
    expect(html).toContain(
      'href="https://github.com/pcbender/spirophonic/blob/main/docs/SOUND-AND-MIDI-DESIGN.md"',
    )
    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('class="source-note"')
    expect(html).not.toContain('Markdown is the source of truth.')
    expect(html).not.toContain('npm run build')
    expect(html).not.toContain('class="page-footer"')
  })

  it('rebuilds exactly three pages from the latest Markdown source', async () => {
    const { sourceDirectory, outputDirectory } = await temporaryDocumentation()
    await generateDocumentation({ sourceDirectory, outputDirectory })

    expect((await readdir(outputDirectory)).sort()).toEqual([
      'domain-model.html',
      'getting-started.html',
      'manual.html',
    ])
    let manual = await readFile(join(outputDirectory, 'manual.html'), 'utf8')
    expect(manual).toContain('Current source for MANUAL.md.')

    await writeFile(
      join(sourceDirectory, 'MANUAL.md'),
      '# Manual\n\nFresh content replaces the previous build.\n',
    )
    await generateDocumentation({ sourceDirectory, outputDirectory })
    manual = await readFile(join(outputDirectory, 'manual.html'), 'utf8')

    expect(manual).toContain('Fresh content replaces the previous build.')
    expect(manual).not.toContain('Current source for MANUAL.md.')
  })
})
