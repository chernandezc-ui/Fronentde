import fs from 'node:fs'
import { defineConfig } from '@playwright/test'

function resolveChromiumExecutable(): string | undefined {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  ]
  return candidates.find((p) => fs.existsSync(p))
}

const detectedBrowserPath = resolveChromiumExecutable()

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    ...(detectedBrowserPath
      ? { launchOptions: { executablePath: detectedBrowserPath } }
      : { channel: 'msedge' }),
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
      testIgnore: /chaos-break-tests\.spec\.ts/,
      use: { viewport: { width: 1024, height: 768 } },
    },
    {
      name: 'mobile-390',
      testIgnore: /chaos-break-tests\.spec\.ts/,
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
