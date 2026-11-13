import { defineConfig, devices } from "@playwright/test";

const port = Number(
  process.env.LOTTERY_TEST_PORT || process.env.CONDUCTOR_PORT || 55020,
);
export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "../../.context/browser/loteria-regression",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "isolated-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm start -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
