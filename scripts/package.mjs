#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3 || manifest.version !== '3.0.0') {
  throw new Error('Packaging expects Manifest V3 and extension version 3.0.0.');
}

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
  'assets/logoamx.png',
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

// One original logo may serve several declared Chrome icon sizes without copies.
const iconFiles = new Map();
for (const declarations of [manifest.icons ?? {}, manifest.action?.default_icon ?? {}]) {
  for (const [declaredSize, file] of Object.entries(declarations)) {
    const size = Number(declaredSize);
    if (!Number.isInteger(size) || size <= 0) throw new Error(`Invalid declared icon size: ${declaredSize}`);
    if (!iconFiles.has(file)) iconFiles.set(file, new Set());
    iconFiles.get(file).add(size);
  }
}
for (const [file, declaredSizes] of iconFiles) {
  const bytes = readFileSync(join(root, file));
  const pngMagic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(pngMagic) || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`${file} is not a valid PNG header.`);
  }
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  const sizes = [...declaredSizes].sort((a, b) => a - b);
  for (const size of sizes) {
    if (width < size || height < size) {
      throw new Error(`${file} is ${width} × ${height}; the declared ${size} × ${size} icon must not be undersized.`);
    }
  }
  if (sizes.some(size => width !== size || height !== size)) {
    console.warn(`Icon notice: ${file} is ${width} × ${height}; Chrome scales the original artwork for declared sizes ${sizes.join(', ')}.`);
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
  const timestamp = new Date('2026-11-16T00:00:00.000Z');
  for (const file of files) {
    const destination = join(sourceDir, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(root, file), destination);
    utimesSync(destination, timestamp, timestamp);
  }
  const temporaryArchive = join(staging, 'extension.zip');
  execFileSync('/usr/bin/zip', ['-X', '-9', '-q', temporaryArchive, ...files], { cwd: sourceDir });
  const archiveEntries = execFileSync('/usr/bin/unzip', ['-Z', '-1', temporaryArchive], { encoding: 'utf8' }).trim().split('\n').sort();
  if (JSON.stringify(archiveEntries) !== JSON.stringify(files)) {
    throw new Error('ZIP contents differ from the runtime allowlist.');
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
