#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { stat, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, resolve } from 'node:path'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const targets = {
  staging: {
    sshTarget: 'STAGING_SSH_USERNAME',
    deployPath: 'STAGING_DEPLOY_PATH',
    sshKey: 'STAGING_SSH_KEY',
  },
  production: {
    sshTarget: 'PROD_USERNAME',
    deployPath: 'PROD_DEPLOY_PATH',
    sshKey: 'PROD_SSH_KEY',
  },
}

const usage = `Usage: npm run deploy -- <staging|production> [--dry-run]

Builds the application, verifies the remote .allow-deploy marker, and syncs
dist/ to the selected server. See docs/DEPLOYMENT.md before the first deploy.`

const shellQuote = (value) => `'${value.replaceAll("'", `'"'"'`)}'`

const requireValue = (environment, name) => {
  const value = environment[name]?.trim()
  if (!value) {
    throw new Error(`Missing ${name} in .env or the process environment.`)
  }
  return value
}

const validateSshTarget = (value, variableName) => {
  if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/u.test(value)) {
    throw new Error(`${variableName} must have the form user@host.`)
  }
}

const normalizeDeployPath = (value, variableName) => {
  const homeRelative = value.startsWith('~/') ? value.slice(2) : value
  if (/[\0\r\n:]/u.test(homeRelative)) {
    throw new Error(`${variableName} contains unsupported characters.`)
  }

  const trimmed = homeRelative.replace(/\/+$/u, '')
  const segments = trimmed.split('/')
  if (
    ['', '.', '..', '~'].includes(trimmed) ||
    trimmed.startsWith('~') ||
    segments.includes('..') ||
    trimmed === '/'
  ) {
    throw new Error(`${variableName} is too broad or contains a parent traversal.`)
  }

  return trimmed
}

const localPath = (value) => {
  if (value === '~') return homedir()
  if (value.startsWith('~/')) return resolve(homedir(), value.slice(2))
  return isAbsolute(value) ? value : resolve(repositoryRoot, value)
}

export const markerFor = (target) => `spirophonic:${target}`

export const configurationFor = (target, environment) => {
  const variableNames = targets[target]
  if (!variableNames) {
    throw new Error(`Unknown deployment target ${JSON.stringify(target)}.`)
  }

  const sshTarget = requireValue(environment, variableNames.sshTarget)
  const deployPath = normalizeDeployPath(
    requireValue(environment, variableNames.deployPath),
    variableNames.deployPath,
  )
  const sshKey = localPath(requireValue(environment, variableNames.sshKey))

  validateSshTarget(sshTarget, variableNames.sshTarget)

  return {
    target,
    sshTarget,
    deployPath,
    sshKey,
    marker: markerFor(target),
  }
}

export const remoteGuardCommand = ({ deployPath, marker }) =>
  [
    'set -eu',
    `deploy_path=${shellQuote(deployPath)}`,
    `expected_marker=${shellQuote(marker)}`,
    'if [ ! -d "$deploy_path" ]; then echo "Deployment refused: target directory does not exist." >&2; exit 40; fi',
    'marker_path="$deploy_path/.allow-deploy"',
    'if [ ! -f "$marker_path" ]; then echo "Deployment refused: .allow-deploy is missing." >&2; exit 41; fi',
    'actual_marker=$(cat "$marker_path")',
    'if [ "$actual_marker" != "$expected_marker" ]; then echo "Deployment refused: .allow-deploy does not match this environment." >&2; exit 42; fi',
    'cd "$deploy_path"',
    'printf "Deployment target verified: %s\\n" "$(pwd -P)"',
  ].join('; ')

export const rsyncArguments = (configuration, { dryRun = false } = {}) => [
  '--archive',
  '--compress',
  '--delay-updates',
  '--delete-delay',
  '--human-readable',
  '--itemize-changes',
  '--no-group',
  '--no-owner',
  '--protect-args',
  '--exclude=/.allow-deploy',
  ...(dryRun ? ['--dry-run'] : []),
  '--rsh',
  `ssh -i ${shellQuote(configuration.sshKey)} -o IdentitiesOnly=yes`,
  '--',
  `${resolve(repositoryRoot, 'dist')}/`,
  `${configuration.sshTarget}:${configuration.deployPath}/`,
]

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: 'inherit',
    ...options,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}.`)
  }
}

const verifySshKey = async (path) => {
  let keyStat
  try {
    keyStat = await stat(path)
  } catch {
    throw new Error('The configured SSH key does not exist.')
  }
  if (!keyStat.isFile()) {
    throw new Error('The configured SSH key is not a file.')
  }
}

const loadEnvironment = async () => {
  let fromFile = {}
  try {
    fromFile = parseEnv(await readFile(resolve(repositoryRoot, '.env'), 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  return { ...fromFile, ...process.env }
}

const parseArguments = (args) => {
  if (args.includes('--help') || args.includes('-h')) return { help: true }

  const positional = args.filter((argument) => !argument.startsWith('-'))
  const unsupported = args.filter(
    (argument) => argument.startsWith('-') && argument !== '--dry-run',
  )
  if (positional.length !== 1 || unsupported.length > 0) {
    throw new Error(usage)
  }

  return {
    help: false,
    target: positional[0],
    dryRun: args.includes('--dry-run'),
  }
}

const verifyRemoteTarget = (configuration) => {
  run('ssh', [
    '-i',
    configuration.sshKey,
    '-o',
    'IdentitiesOnly=yes',
    '--',
    configuration.sshTarget,
    remoteGuardCommand(configuration),
  ])
}

const main = async () => {
  const args = parseArguments(process.argv.slice(2))
  if (args.help) {
    console.log(usage)
    return
  }

  const configuration = configurationFor(args.target, await loadEnvironment())
  await verifySshKey(configuration.sshKey)

  console.log(
    `${args.dryRun ? 'Dry-run deployment' : 'Deployment'}: ${configuration.target}`,
  )
  console.log(`Remote destination: ${configuration.sshTarget}:${configuration.deployPath}/`)
  console.log(`Required marker: ${configuration.marker}`)

  // Check before the build for a quick failure, then again immediately before
  // rsync so the destructive --delete operation never relies on a stale check.
  verifyRemoteTarget(configuration)
  run('npm', ['run', 'build'])
  await stat(resolve(repositoryRoot, 'dist/index.html'))
  verifyRemoteTarget(configuration)

  run('rsync', rsyncArguments(configuration, { dryRun: args.dryRun }))
  verifyRemoteTarget(configuration)

  console.log(args.dryRun ? 'Dry run completed; no files were changed.' : 'Deployment completed.')
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
