#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'runtime', 'manifest.json');
const installerPkgPath = path.join(rootDir, 'installer', 'package.json');
const installerLockPath = path.join(rootDir, 'installer', 'package-lock.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = typeof manifest.version === 'string' ? manifest.version.trim() : '';
if (!version) {
  throw new Error(`Missing valid "version" in ${manifestPath}`);
}

const pkg = JSON.parse(fs.readFileSync(installerPkgPath, 'utf8'));
if (pkg.version !== version) {
  pkg.version = version;
  fs.writeFileSync(installerPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

if (fs.existsSync(installerLockPath)) {
  const lock = JSON.parse(fs.readFileSync(installerLockPath, 'utf8'));
  let changed = false;
  if (lock.version !== version) {
    lock.version = version;
    changed = true;
  }
  if (lock.packages && lock.packages[''] && lock.packages[''].version !== version) {
    lock.packages[''].version = version;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(installerLockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  }
}

console.log(`Synchronized installer version -> ${version}`);
