const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  outputDir: 'temp/test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'temp/pw-report' }]
  ],
  use: {
    headless: true,
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1366, height: 900 }
      }
    },
    {
      name: 'webkit-desktop',
      use: {
        browserName: 'webkit',
        viewport: { width: 1366, height: 900 }
      }
    },
    {
      name: 'webkit-iphone12',
      use: {
        browserName: 'webkit',
        ...devices['iPhone 12']
      }
    }
  ]
});
