const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: 'reader-zlatoust-*.spec.js',
  timeout: 30000,
  workers: 1,
  reporter: 'list'
});
