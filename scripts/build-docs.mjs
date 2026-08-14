#!/usr/bin/env node

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Marked } from 'marked'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const githubSourceRoot = 'https://github.com/pcbender/spirophonic/blob/main/'

export const documentationSources = Object.freeze([
  Object.freeze({
    source: 'GETTING-STARTED.md',
    output: 'getting-started.html',
    title: 'Getting Started',
  }),
  Object.freeze({ source: 'MANUAL.md', output: 'manual.html', title: 'Manual' }),
  Object.freeze({
    source: 'Spirophonic-Domain-Model.md',
    output: 'domain-model.html',
    title: 'Domain Model',
  }),
])

const publishedBySource = new Map(
  documentationSources.map((document) => [document.source, document]),
)

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const encodedRepositoryPath = (path) =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

/** Resolve authored Markdown links without leaving dead `.md` URLs deployed. */
export const rewriteDocumentationHref = (href, currentSource) => {
  const value = String(href ?? '').trim()
  if (/^(?:javascript|vbscript|data):/iu.test(value)) return '#'
  if (
    value === '' ||
    value.startsWith('#') ||
    value.startsWith('/') ||
    value.startsWith('//') ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)
  ) {
    return value
  }

  const match = /^([^?#]*)([?#].*)?$/u.exec(value)
  const authoredPath = match?.[1] ?? value
  const suffix = match?.[2] ?? ''
  if (!authoredPath.toLowerCase().endsWith('.md')) return value

  const sourceRelativePath = posix.normalize(
    posix.join(posix.dirname(currentSource), authoredPath),
  )
  const published = publishedBySource.get(sourceRelativePath)
  if (published) return `${published.output}${suffix}`

  const repositoryPath = posix.normalize(
    posix.join('docs', posix.dirname(currentSource), authoredPath),
  )
  return `${githubSourceRoot}${encodedRepositoryPath(repositoryPath)}${suffix}`
}

const headingSlugger = () => {
  const counts = new Map()
  return (heading) => {
    const base = String(heading)
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s_-]/gu, '')
      .trim()
      .replace(/\s+/gu, '-') || 'section'
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}

const markdownBody = (markdown, currentSource) => {
  const slug = headingSlugger()
  const parser = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text: rawText }) {
        const text = this.parser.parseInline(tokens)
        const id = slug(rawText)
        return `<h${depth} id="${escapeHtml(id)}"><a class="heading-anchor" href="#${escapeHtml(id)}" aria-label="Link to ${escapeHtml(rawText)}">#</a>${text}</h${depth}>\n`
      },
      link({ href, title, tokens }) {
        const rewritten = rewriteDocumentationHref(href, currentSource)
        const label = this.parser.parseInline(tokens)
        const titleAttribute = title
          ? ` title="${escapeHtml(title)}"`
          : ''
        return `<a href="${escapeHtml(rewritten)}"${titleAttribute}>${label}</a>`
      },
      // The three repository documents are trusted authored input. Escaping
      // raw HTML still keeps a future typo from becoming executable markup.
      html({ text }) {
        return escapeHtml(text)
      },
    },
  })
  return parser.parse(markdown)
}

const pageStyles = `
:root {
  color: #f6f4ef;
  background: #101014;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  line-height: 1.6;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; }
a { color: #42cafd; text-underline-offset: 0.18em; }
a:hover { color: #8ee3ff; }
.site-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.7rem 1.2rem;
  border-bottom: 1px solid rgba(246, 244, 239, 0.16);
  padding: 0.8rem clamp(1rem, 4vw, 3rem);
  background: rgba(16, 16, 20, 0.96);
  backdrop-filter: blur(12px);
}
.site-name { margin-right: auto; color: #f6f4ef; font-weight: 700; text-decoration: none; }
.document-nav { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.document-nav a {
  border: 1px solid rgba(246, 244, 239, 0.2);
  border-radius: 0.4rem;
  padding: 0.25rem 0.6rem;
  color: #d8d3ca;
  font-size: 0.84rem;
  text-decoration: none;
}
.document-nav a[aria-current='page'] { border-color: #f2c14e; color: #f2c14e; }
.document-shell { width: min(100% - 2rem, 980px); margin: 0 auto; padding: 2.2rem 0 4rem; }
h1, h2, h3, h4, h5, h6 { position: relative; scroll-margin-top: 5.5rem; color: #f6f4ef; line-height: 1.25; }
h1 { margin: 0 0 0.8rem; font-size: clamp(2rem, 5vw, 3rem); }
h2 { margin-top: 2.6rem; border-bottom: 1px solid rgba(246, 244, 239, 0.14); padding-bottom: 0.35rem; }
.heading-anchor { position: absolute; right: 100%; padding-right: 0.45rem; color: #706b63; text-decoration: none; opacity: 0; }
h1:hover .heading-anchor, h2:hover .heading-anchor, h3:hover .heading-anchor, .heading-anchor:focus { opacity: 1; }
p, li { color: #d8d3ca; }
blockquote { margin-left: 0; border-left: 3px solid #f2c14e; padding: 0.1rem 0 0.1rem 1rem; color: #d8d3ca; }
code { border-radius: 0.25rem; padding: 0.1rem 0.3rem; background: #23232b; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.9em; }
pre { overflow-x: auto; border: 1px solid rgba(246, 244, 239, 0.14); border-radius: 0.55rem; padding: 1rem; background: #18181f; }
pre code { padding: 0; background: transparent; }
.table-scroll { overflow-x: auto; }
table { display: block; width: 100%; overflow-x: auto; border-collapse: collapse; }
th, td { border: 1px solid rgba(246, 244, 239, 0.16); padding: 0.5rem 0.65rem; text-align: left; vertical-align: top; }
th { color: #f6f4ef; background: #1d1d24; }
tr:nth-child(even) { background: rgba(246, 244, 239, 0.025); }
hr { border: 0; border-top: 1px solid rgba(246, 244, 239, 0.16); }
@media (max-width: 640px) {
  .site-header { align-items: flex-start; }
  .site-name { width: 100%; }
  .document-shell { width: min(100% - 1.4rem, 980px); padding-top: 1.4rem; }
  .heading-anchor { position: static; padding-right: 0.35rem; opacity: 0.55; }
}
`

export const renderDocumentationPage = ({ document, markdown }) => {
  if (!document) throw new TypeError('A documentation source is required.')
  const body = markdownBody(markdown, document.source)
  const navigation = documentationSources
    .map((item) => {
      const current = item.source === document.source
        ? ' aria-current="page"'
        : ''
      return `<a href="${item.output}"${current}>${escapeHtml(item.title)}</a>`
    })
    .join('\n        ')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>${escapeHtml(document.title)} · Spirophonic</title>
  <style>${pageStyles}</style>
</head>
<body>
  <header class="site-header">
    <a class="site-name" href="/">← Spirophonic</a>
    <nav class="document-nav" aria-label="Documentation">
        ${navigation}
    </nav>
  </header>
  <main class="document-shell">
    <article>
${body}
    </article>
  </main>
</body>
</html>
`
}

export const generateDocumentation = async ({
  sourceDirectory = resolve(repositoryRoot, 'docs'),
  outputDirectory = resolve(repositoryRoot, 'public', 'docs'),
} = {}) => {
  const pages = await Promise.all(
    documentationSources.map(async (document) => ({
      document,
      html: renderDocumentationPage({
        document,
        markdown: await readFile(resolve(sourceDirectory, document.source), 'utf8'),
      }),
    })),
  )
  await mkdir(outputDirectory, { recursive: true })
  const expected = new Set(documentationSources.map(({ output }) => output))
  const existing = await readdir(outputDirectory)
  await Promise.all(
    existing
      .filter((name) => name.endsWith('.html') && !expected.has(name))
      .map((name) => rm(resolve(outputDirectory, name))),
  )
  await Promise.all(
    pages.map(({ document, html }) =>
      writeFile(resolve(outputDirectory, document.output), html),
    ),
  )
  return pages.map(({ document }) => resolve(outputDirectory, document.output))
}

const main = async () => {
  const outputs = await generateDocumentation()
  console.log(`Generated ${outputs.length} documentation pages in public/docs/.`)
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
