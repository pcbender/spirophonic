# Deployment

Spirophonic is a static Vite application. The deployment script builds `dist/`
and copies it to a pre-authorized web root over SSH and rsync.

## Prerequisites

The deployment machine needs Node.js, npm, OpenSSH, and rsync. The remote server
must accept SSH-key authentication and have rsync installed. Run deployment
from macOS, Linux, or WSL2; native Windows does not normally include rsync.

The current Vite build uses a root base URL (`/`). Its deploy path should
therefore be the document root for the site or subdomain. Hosting it below a
URL prefix requires a corresponding Vite `base` change first.

## Local configuration

The ignored repository-root `.env` file supplies these settings:

```dotenv
STAGING_SSH_USERNAME=deployer@staging.example.com
STAGING_DEPLOY_PATH=sites/spirophonic-staging
STAGING_SSH_KEY=~/.ssh/spirophonic_staging

PROD_USERNAME=deployer@example.com
PROD_DEPLOY_PATH=/srv/www/spirophonic
PROD_SSH_KEY=~/.ssh/spirophonic_production
```

The username settings intentionally include both the SSH user and host. Deploy
paths may be absolute or relative to the SSH account's login directory. A
leading `~/` is normalized to a plain home-relative path. Process
environment variables override `.env` values. The script parses `.env` as data;
it does not source the file or pass its unrelated secrets to child processes.

## Authorize each remote directory

Deployment is refused unless the exact destination already exists and contains
an environment-specific `.allow-deploy` file:

```text
# staging destination
spirophonic:staging

# production destination
spirophonic:production
```

Create the appropriate file manually while logged into the server. This is an
intentional one-time server-side action: the deployment script will never
create a destination or authorize one for itself. Confirm the directory with
`pwd -P` before writing the marker.

The exact value prevents a staging command from targeting production, while the
file location protects neighboring sites on the same server. The script checks
the marker before the build, immediately before rsync, and after rsync. It also
excludes `.allow-deploy` from synchronization, so `--delete-delay` cannot remove
the guard. File updates are delayed until transfer completes to reduce partial
live-site states.

## Deploy

Start with a dry run. It performs the real build and remote checks, then asks
rsync to report changes without applying them:

```bash
npm run deploy -- staging --dry-run
npm run deploy -- production --dry-run
```

When the reported destination and file changes are correct, deploy with:

```bash
npm run deploy -- staging
npm run deploy -- production
```

The target is always required; there is no default environment. SSH retains its
normal host-key checking, so a new or changed server identity must be handled
explicitly rather than silently trusted.
