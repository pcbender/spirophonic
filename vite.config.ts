import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright specs live in e2e/ and are run by `npm run test:e2e`. Without
    // this, Vitest matches their *.spec.ts names, fails to load @playwright/test,
    // and exits non-zero while still reporting every unit test as passing.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
