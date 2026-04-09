const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

function changedPathsFromGit() {
  try {
    const output = execSync('git status --porcelain=v1', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    return output
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map((line) => {
        const payload = line.slice(3);
        if (payload.includes(' -> ')) {
          return payload.split(' -> ').pop();
        }
        return payload;
      })
      .map((p) => p.replace(/\//g, path.sep).replace(/\\/g, path.sep));
  } catch {
    return [];
  }
}

function fileUsesSharedAsset(relativeHtmlPath, sharedAssetName) {
  try {
    const absolutePath = path.join(ROOT, relativeHtmlPath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    return content.includes(sharedAssetName);
  } catch {
    return false;
  }
}

function expandChangedEntries(changedEntries) {
  const expanded = new Set();

  for (const entry of changedEntries) {
    const absolutePath = path.join(ROOT, entry);

    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
      const nested = collectHtmlFiles(absolutePath, []);
      for (const htmlFile of nested) {
        expanded.add(htmlFile);
      }
      continue;
    }

    expanded.add(entry);
  }

  return [...expanded];
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
  const scope = (process.env.REVIEW_SCOPE || '').trim().toLowerCase();

  if (scope === 'all') {
    return filter
      ? allFiles.filter((file) => file.toLowerCase().includes(filter))
      : allFiles;
  }

  const changed = changedPathsFromGit();
  const expandedChanged = expandChangedEntries(changed);
  const changedHtml = expandedChanged
    .filter((file) => file.toLowerCase().endsWith('.html'))
    .filter((file) => !file.split(path.sep).some((part) => EXCLUDED_DIRS.has(part)));

  const impactedByShared = new Set();
  const sharedCssChanged = changed.some((file) => file === path.join('shared', 'topological-baseline.css'));
  const sharedJsChanged = changed.some((file) => file === path.join('shared', 'viewer-controls.js'));

  if (sharedCssChanged) {
    for (const file of allFiles) {
      if (fileUsesSharedAsset(file, 'topological-baseline.css')) {
        impactedByShared.add(file);
      }
    }
  }

  if (sharedJsChanged) {
    for (const file of allFiles) {
      if (fileUsesSharedAsset(file, 'viewer-controls.js')) {
        impactedByShared.add(file);
      }
    }
  }

  const targeted = [...new Set([...changedHtml, ...impactedByShared])].sort();
  const base = targeted.length ? targeted : [];
  return filter
    ? base.filter((file) => file.toLowerCase().includes(filter))
    : base;
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
