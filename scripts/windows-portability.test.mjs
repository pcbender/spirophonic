import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const readJson = async (path) =>
  JSON.parse(await readFile(resolve(repositoryRoot, path), 'utf8'))

const viteScripts = ['dev', 'build', 'test', 'test:watch', 'preview']
const windowsBindings = [
  '@rolldown/binding-win32-x64-msvc',
  'lightningcss-win32-x64-msvc',
]

const usesRunnerConfigLoader = (command) =>
  /(?:^|\s)--configLoader(?:=|\s+)runner(?:\s|$)/u.test(command)

const writesBelowNodeModules = (path) => {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//u, '')
  return normalized === 'node_modules' || normalized.startsWith('node_modules/')
}

const portabilityProblems = ({ packageJson, tsconfigs }) => {
  const problems = []

  for (const script of viteScripts) {
    const command = packageJson.scripts?.[script]
    if (typeof command !== 'string' || !usesRunnerConfigLoader(command)) {
      problems.push(`${script} does not use Vite's runner config loader`)
    }
  }

  for (const binding of windowsBindings) {
    if (!packageJson.optionalDependencies?.[binding]) {
      problems.push(`${binding} is not an optional dependency`)
    }
  }

  for (const [name, config] of Object.entries(tsconfigs)) {
    const buildInfo = config.compilerOptions?.tsBuildInfoFile
    if (typeof buildInfo !== 'string' || writesBelowNodeModules(buildInfo)) {
      problems.push(`${name} writes build metadata below node_modules`)
    }
  }

  return problems
}

describe('native Windows tooling portability', () => {
  it('keeps Vite and TypeScript caches out of node_modules', async () => {
    const [packageJson, appConfig, nodeConfig] = await Promise.all([
      readJson('package.json'),
      readJson('tsconfig.app.json'),
      readJson('tsconfig.node.json'),
    ])

    expect(
      portabilityProblems({
        packageJson,
        tsconfigs: { app: appConfig, node: nodeConfig },
      }),
    ).toEqual([])
  })

  it('rejects the Windows-breaking defaults', () => {
    const problems = portabilityProblems({
      packageJson: {
        scripts: Object.fromEntries(viteScripts.map((script) => [script, script])),
        optionalDependencies: {},
      },
      tsconfigs: {
        app: { compilerOptions: { tsBuildInfoFile: './node_modules/.tmp/app' } },
        node: { compilerOptions: {} },
      },
    })

    expect(problems).toHaveLength(9)
    expect(problems).toContain('test does not use Vite\'s runner config loader')
    expect(problems).toContain(
      'app writes build metadata below node_modules',
    )
    expect(problems).toContain(
      '@rolldown/binding-win32-x64-msvc is not an optional dependency',
    )
  })
})
