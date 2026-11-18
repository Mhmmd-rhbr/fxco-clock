#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReleasePng } from './release-png.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const packageInfo = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (manifest.manifest_version !== 3 || manifest.version !== packageInfo.version) {
  throw new Error('Packaging expects Manifest V3 and matching manifest/package versions.');
}

const iconSizes = new Map([16, 32, 48, 128].map(size => [`assets/icons/icon-${size}.png`, size]));
const files = [
  'manifest.json',
  'popup.html',
  'dashboard.html',
  'privacy.html',
  'popup.js',
  'styles.css',
  'background.js',
  'lib/engine.js',
  'lib/store.js',
  'lib/calendar.js',
  ...iconSizes.keys(),
  'PRIVACY.md',
  'LICENSE',
];
files.sort();

for (const file of files) {
  const source = join(root, file);
  if (!existsSync(source) || !lstatSync(source).isFile()) {
    throw new Error(`Missing regular runtime file: ${file}`);
  }
}

const manifestPaths = [
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  manifest.options_ui?.page?.split('#')[0],
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
].filter(Boolean);
for (const file of manifestPaths) {
  if (!files.includes(file)) throw new Error(`Manifest references a file outside the runtime allowlist: ${file}`);
}

if (iconSizes.get(manifest.icons?.['128']) !== 128) throw new Error('Missing 128 × 128 installation icon.');
for (const declarations of [manifest.icons ?? {}, manifest.action?.default_icon ?? {}]) {
  for (const [declaredSize, file] of Object.entries(declarations)) {
    if (String(iconSizes.get(file)) !== declaredSize) {
      throw new Error(`Invalid icon declaration: ${declaredSize} → ${file}`);
    }
  }
}

for (const file of files.filter(name => /\.(css|html|js)$/.test(name))) {
  const source = readFileSync(join(root, file), 'utf8');
  for (const [, asset] of source.matchAll(/["'](assets\/[^"'\s]+)["']/g)) {
    if (!files.includes(asset)) throw new Error(`Missing packaged asset ${asset} referenced by ${file}.`);
  }
}

// Check local static imports, re-exports and literal dynamic imports in runtime JS.
// Runtime modules are deliberately plain files without npm resolution or a bundler.
for (const file of files.filter(name => name.endsWith('.js'))) {
  const source = readFileSync(join(root, file), 'utf8');
  const specifiers = [
    ...source.matchAll(/\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?["']([^"']+)["']/g),
    ...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
  ].map(match => match[1]);
  for (const specifier of specifiers) {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
      throw new Error(`Runtime module ${file} has a non-local import: ${specifier}`);
    }
    const target = relative(root, resolve(root, dirname(file), specifier)).split(sep).join('/');
    if (!files.includes(target)) throw new Error(`Runtime import in ${file} is outside the allowlist: ${target}`);
  }
}

const staging = mkdtempSync(join(tmpdir(), 'aryamerx-clock-package-'));
try {
  const sourceDir = join(staging, 'extension');
  // Stable ZIP timestamps and sorted entries make repeated packaging reproducible.
  const timestamp = new Date('2026-11-18T00:00:00.000Z');
  for (const file of files) {
    const destination = join(sourceDir, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(root, file), destination);
    utimesSync(destination, timestamp, timestamp);
  }
  const temporaryArchive = join(staging, 'extension.zip');
  execFileSync('/usr/bin/zip', ['-X', '-9', '-q', temporaryArchive, ...files], { cwd: sourceDir });
  execFileSync('/usr/bin/unzip', ['-tq', temporaryArchive]);
  const archiveEntries = execFileSync('/usr/bin/unzip', ['-Z', '-1', temporaryArchive], { encoding: 'utf8' }).trim().split('\n').sort();
  if (JSON.stringify(archiveEntries) !== JSON.stringify(files)) {
    throw new Error('ZIP contents differ from the runtime allowlist.');
  }
  for (const [file, size] of iconSizes) {
    validateReleasePng(execFileSync('/usr/bin/unzip', ['-p', temporaryArchive, file]), size, file);
  }
  const archiveData = readFileSync(temporaryArchive);
  const destinationDir = join(root, 'dist');
  mkdirSync(destinationDir, { recursive: true });
  const destination = join(destinationDir, `aryamerx-financial-clock-${manifest.version}.zip`);
  renameSync(temporaryArchive, destination);
  console.log(JSON.stringify({
    archive: destination,
    version: manifest.version,
    files: files.length,
    compressedBytes: archiveData.length,
    uncompressedBytes: files.reduce((total, file) => total + statSync(join(root, file)).size, 0),
    sha256: createHash('sha256').update(archiveData).digest('hex'),
  }, null, 2));
} finally {
  rmSync(staging, { recursive: true, force: true });
}
