const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const SHOT_ROOT = path.join(ROOT, 'temp', 'pw-shots');
const EXCLUDED_DIRS = new Set([
  '.git',
  '.codex',
  '.tmp_chrome_profile',
  '.tmp_shots',
  '.pw-shots',
  '.pw-report',
  'temp',
  'node_modules',
  'notes',
  'shared',
  'tests'
]);

function collectHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      collectHtmlFiles(fullPath, files);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(relPath);
    }
  }

  return files;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function shotPathFor(projectName, relativeHtmlPath) {
  const normalized = relativeHtmlPath.replace(/\\/g, '/');
  return path.join(SHOT_ROOT, projectName, normalized.replace(/\.html$/i, '.png'));
}

function relevantPages() {
  const allFiles = collectHtmlFiles(ROOT).sort();
  const filter = (process.env.HTML_FILTER || '').trim().toLowerCase();
  if (!filter) return allFiles;
  return allFiles.filter((file) => file.toLowerCase().includes(filter));
}

const HTML_FILES = relevantPages();

test.describe('static html render review', () => {
  test.skip(HTML_FILES.length === 0, 'No HTML files matched the current filter.');

  for (const relativeHtmlPath of HTML_FILES) {
    test(relativeHtmlPath, async ({ page }, testInfo) => {
      const absolutePath = path.join(ROOT, relativeHtmlPath);
      const fileUrl = pathToFileURL(absolutePath).href;

      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(String(error)));

      await page.goto(fileUrl, { waitUntil: 'load' });
      await page.waitForTimeout(900);

      const screenshotPath = shotPathFor(testInfo.project.name, relativeHtmlPath);
      ensureDir(path.dirname(screenshotPath));
      await page.screenshot({ path: screenshotPath, fullPage: true });

      testInfo.attachments.push({
        name: 'screenshot',
        contentType: 'image/png',
        path: screenshotPath
      });

      expect(pageErrors, `Page errors in ${relativeHtmlPath}`).toEqual([]);
    });
  }
});
