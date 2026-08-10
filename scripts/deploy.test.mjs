import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import {
  configurationFor,
  markerFor,
  remoteGuardCommand,
  rsyncArguments,
} from './deploy.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { force: true, recursive: true }),
    ),
  )
})

const environment = {
  STAGING_SSH_USERNAME: 'deployer@staging.example.test',
  STAGING_DEPLOY_PATH: 'sites/spirophonic-staging',
  STAGING_SSH_KEY: './test-key',
  PROD_USERNAME: 'deployer@example.test',
  PROD_DEPLOY_PATH: '/srv/www/spirophonic',
  PROD_SSH_KEY: './test-key',
}

describe('safe deployment configuration', () => {
  it('uses a different exact marker for each environment', () => {
    expect(markerFor('staging')).toBe('spirophonic:staging')
    expect(markerFor('production')).toBe('spirophonic:production')
  })

  it('rejects broad, traversing, and malformed destinations', () => {
    expect(() =>
      configurationFor('production', {
        ...environment,
        PROD_DEPLOY_PATH: '/',
      }),
    ).toThrow(/too broad/u)
    expect(() =>
      configurationFor('production', {
        ...environment,
        PROD_DEPLOY_PATH: 'sites/../elsewhere',
      }),
    ).toThrow(/parent traversal/u)
    expect(
      configurationFor('production', {
        ...environment,
        PROD_DEPLOY_PATH: '~/sites/spirophonic',
      }).deployPath,
    ).toBe('sites/spirophonic')
    expect(() =>
      configurationFor('production', {
        ...environment,
        PROD_DEPLOY_PATH: '~/../spirophonic',
      }),
    ).toThrow(/parent traversal/u)
    expect(() =>
      configurationFor('production', {
        ...environment,
        PROD_USERNAME: 'missing-host',
      }),
    ).toThrow(/user@host/u)
  })

  it('keeps the marker outside rsync deletion and supports a dry run', () => {
    const configuration = configurationFor('production', environment)
    const args = rsyncArguments(configuration, { dryRun: true })

    expect(args).toContain('--delete-delay')
    expect(args).toContain('--delay-updates')
    expect(args).toContain('--exclude=/.allow-deploy')
    expect(args).toContain('--dry-run')
    expect(args.slice(-3)).toEqual([
      '--',
      expect.stringMatching(/\/dist\/$/u),
      'deployer@example.test:/srv/www/spirophonic/',
    ])
  })
})

describe.skipIf(process.platform === 'win32')('remote deployment marker guard', () => {
  it('accepts only the exact marker in the selected directory', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'spirophonic-deploy-'))
    temporaryDirectories.push(directory)
    const command = remoteGuardCommand({
      deployPath: directory,
      marker: 'spirophonic:production',
    })

    expect(spawnSync('sh', ['-c', command]).status).not.toBe(0)

    await writeFile(join(directory, '.allow-deploy'), 'spirophonic:staging\n')
    expect(spawnSync('sh', ['-c', command]).status).not.toBe(0)

    await writeFile(join(directory, '.allow-deploy'), 'spirophonic:production\n')
    expect(spawnSync('sh', ['-c', command]).status).toBe(0)
  })

  it('quotes remote paths instead of allowing shell execution', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'spirophonic-deploy-'))
    temporaryDirectories.push(parent)
    const directory = join(parent, "site's files")
    const marker = join(parent, 'injection-ran')
    const command = remoteGuardCommand({
      deployPath: directory,
      marker: `spirophonic:staging'; touch ${marker}; echo '`,
    })

    expect(spawnSync('sh', ['-c', command]).status).not.toBe(0)
    expect(spawnSync('test', ['-e', marker]).status).not.toBe(0)
  })
})
