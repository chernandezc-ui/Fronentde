import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    channel: 'msedge',
    trace: 'off',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'desktop-1440',
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet-1024',
      use: { viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'mobile-390',
      use: { viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
