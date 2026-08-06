import { defineConfig, devices } from '@playwright/test'

/**
 * Browser validation for the packets whose acceptance criteria are visual or
 * audible. Vitest still owns deterministic core and scheduler coverage; these
 * checks supplement it and never replace it.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  outputDir: './e2e/.artifacts',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 1000 },
        launchOptions: {
          args: [
            // Web Audio needs a device and permission to start without a
            // gesture, otherwise playback silently stays suspended headless.
            '--autoplay-policy=no-user-gesture-required',
            '--use-fake-device-for-media-stream',
            '--use-fake-ui-for-media-stream',
            '--mute-audio',
          ],
        },
      },
    },
    {
      // MG-21 requires a second current engine. Firefox is the meaningful
      // choice: it is the other independent implementation of AudioWorklet,
      // IndexedDB, and Canvas that this app depends on, so it catches
      // Chromium-specific assumptions that a second Chromium never would.
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1600, height: 1000 },
        launchOptions: {
          firefoxUserPrefs: {
            // Firefox has no autoplay flag; these are the equivalent prefs.
            'media.autoplay.default': 0,
            'media.autoplay.blocking_policy': 0,
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
          },
        },
      },
    },
  ],
  webServer: {
    // Preview serves the production build, so these checks exercise exactly
    // what `npm run build` produces, including the pinned SoundFont worklet.
    command: 'npm run build && npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
