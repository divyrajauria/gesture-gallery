// End-to-end tests for the gallery. The page is served as-is (no build) and
// driven in Chromium; hand tracking is replaced by a stand-in that feeds
// simulated hand landmarks, so the gesture logic runs without a webcam.
const { defineConfig } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1400, height: 900 },
    browserName: 'chromium',
    trace: 'retain-on-failure',
    launchOptions: {
      // A fake webcam that is always allowed, for the camera tests.
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  webServer: {
    command: `node tests/serve.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
  },
});
