#!/usr/bin/env node
'use strict';
/*
 * OpenCode Harness — generic minimal app.asar patcher.
 *
 * Non-destructively appends out/harness/harness-boot.js + harness-meta.json and
 * points package.json "main" to the boot shim. The original entry bytes stay
 * untouched in the ASAR data section, so unpatch is a pure header change.
 *
 * Usage:
 *   node patch-asar.js status  <app.asar>
 *   node patch-asar.js version <app.asar>
 *   node patch-asar.js patch   <app.asar> <harness-boot.js>
 *   node patch-asar.js unpatch <app.asar>
 */

// Treat .asar files as regular binary files even under ELECTRON_RUN_AS_NODE=1.
process.noAsar = true;

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BLOCK = 4 * 1024 * 1024;
const HARNESS_DIR = 'out/harness';
const BOOT_NAME = 'harness-boot.js';
const META_NAME = 'harness-meta.json';
const DEFAULT_MAIN = './out/main/index.js';

function readArchive(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 16) throw new Error(`Invalid ASAR file (too small): ${file}`);
  const headerPickleSize = buf.readUInt32LE(4);
  const strLen = buf.readUInt32LE(12);
  const headerEnd = 16 + strLen;
  const dataStart = 8 + headerPickleSize;
  if (headerEnd > buf.length || dataStart > buf.length || headerEnd > dataStart) {
    throw new Error(`Corrupt ASAR header in ${file}`);
  }
  const header = JSON.parse(buf.subarray(16, headerEnd).toString('utf8'));
  return { buf, header, data: buf.subarray(dataStart) };
}

function integrity(content) {
  const blocks = [];
  for (let i = 0; i < content.length; i += BLOCK) {
    blocks.push(crypto.createHash('sha256').update(content.subarray(i, i + BLOCK)).digest('hex'));
  }
  if (blocks.length === 0) {
    blocks.push(crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex'));
  }
  return {
    algorithm: 'SHA256',
    hash: crypto.createHash('sha256').update(content).digest('hex'),
    blockSize: BLOCK,
    blocks,
  };
}

function serialize(header, data) {
  const json = Buffer.from(JSON.stringify(header), 'utf8');
  const padded = Math.ceil(json.length / 4) * 4;
  const headerPickle = Buffer.alloc(8 + padded);
  headerPickle.writeUInt32LE(4 + padded, 0);
  headerPickle.writeUInt32LE(json.length, 4);
  json.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4, 0);
  sizePickle.writeUInt32LE(headerPickle.length, 4);
  return Buffer.concat([sizePickle, headerPickle, data]);
}

function fileContent(arc, entry) {
  const off = Number(entry.offset);
  return arc.data.subarray(off, off + entry.size);
}

function readEntry(header, arc, p) {
  let node = header;
  for (const seg of p.split('/').filter(Boolean)) {
    if (!node.files || !node.files[seg]) return null;
    node = node.files[seg];
  }
  return node && !node.files ? fileContent(arc, node) : null;
}

function readMeta(arc) {
  try {
    const raw = readEntry(arc.header, arc, `${HARNESS_DIR}/${META_NAME}`);
    if (!raw) return null;
    return JSON.parse(raw.toString('utf8'));
  } catch {
    return null;
  }
}

function status(file) {
  const arc = readArchive(file);
  const pkgEntry = arc.header.files && arc.header.files['package.json'];
  if (!pkgEntry) throw new Error(`Missing package.json inside ${file}`);
  const pkg = JSON.parse(fileContent(arc, pkgEntry).toString('utf8'));
  const meta = readMeta(arc);
  const bootPath = `${HARNESS_DIR}/${BOOT_NAME}`;

  let state = 'original';
  if (pkg.main === `./${bootPath}` && meta && meta.originalMain) {
    state = 'patched';
  }

  return { arc, pkg, meta, state };
}

function getAppVersion(file) {
  const { pkg } = status(file);
  return pkg.version || 'unknown';
}

function swapFileVerified(file, outBuffer, expectedState, origMainContent, origMainPath) {
  const tmp = `${file}.harness-tmp-${process.pid}`;
  try {
    const opts = process.platform === 'win32' ? undefined : { mode: 0o644 };
    fs.writeFileSync(tmp, outBuffer, opts);

    const check = status(tmp);
    if (check.state !== expectedState) {
      throw new Error(`ASAR verification failed: expected ${expectedState}, got ${check.state}`);
    }
    if (origMainContent && origMainPath) {
      const mainNew = readEntry(check.arc.header, check.arc, origMainPath.replace(/^\.\//, ''));
      if (!mainNew || !origMainContent.equals(mainNew)) {
        throw new Error('ASAR verification failed: original main entry changed unexpectedly');
      }
    }

    try {
      fs.renameSync(tmp, file);
    } catch (err) {
      if (err && (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES')) {
        throw new Error(
          `Cannot replace ${file} (${err.code}). Please fully close OpenCode and check write permissions.`
        );
      }
      throw err;
    }
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function ensureDir(header, segments) {
  let node = header;
  for (const seg of segments) {
    node.files = node.files || {};
    if (!node.files[seg]) node.files[seg] = { files: {} };
    node = node.files[seg];
  }
  return node;
}

function patch(file, bootFile) {
  if (!bootFile || !fs.existsSync(bootFile)) {
    throw new Error(`Boot file not found: ${bootFile}`);
  }
  const { arc, pkg, state } = status(file);
  if (state === 'patched') {
    return { previousState: 'patched', state: 'patched', deltaBytes: 0 };
  }

  const originalMain = typeof pkg.main === 'string' && pkg.main.trim() ? pkg.main.trim() : DEFAULT_MAIN;
  const origMainContent = readEntry(arc.header, arc, originalMain.replace(/^\.\//, ''));
  if (!origMainContent) throw new Error(`Missing original main entry in ${file}: ${originalMain}`);

  const header = JSON.parse(JSON.stringify(arc.header));
  const appended = [];
  let cursor = arc.data.length;
  const add = (content) => {
    const entry = { size: content.length, offset: String(cursor), integrity: integrity(content) };
    appended.push(content);
    cursor += content.length;
    return entry;
  };

  const dir = ensureDir(header, HARNESS_DIR.split('/'));
  const newPkg = Buffer.from(JSON.stringify({ ...pkg, main: `./${HARNESS_DIR}/${BOOT_NAME}` }, null, 2) + '\n', 'utf8');
  const meta = Buffer.from(JSON.stringify({ originalMain, harnessVersion: 1 }, null, 2) + '\n', 'utf8');
  header.files['package.json'] = add(newPkg);
  dir.files[BOOT_NAME] = add(fs.readFileSync(bootFile));
  dir.files[META_NAME] = add(meta);

  const out = serialize(header, Buffer.concat([arc.data, ...appended]));
  swapFileVerified(file, out, 'patched', origMainContent, originalMain);
  return {
    previousState: state,
    state: 'patched',
    deltaBytes: out.length - arc.buf.length,
  };
}

function unpatch(file) {
  const { arc, pkg, meta, state } = status(file);
  if (state === 'original') {
    return { changed: false, previousState: 'original', state: 'original' };
  }

  const originalMain = (meta && meta.originalMain) || DEFAULT_MAIN;
  const origMainContent = readEntry(arc.header, arc, originalMain.replace(/^\.\//, ''));
  if (!origMainContent) throw new Error(`Missing original main entry in ${file}: ${originalMain}`);

  const header = JSON.parse(JSON.stringify(arc.header));
  if (header.files.out && header.files.out.files && header.files.out.files.harness) {
    delete header.files.out.files.harness;
  }

  const appended = [];
  let cursor = arc.data.length;
  const newPkg = Buffer.from(JSON.stringify({ ...pkg, main: originalMain }, null, 2) + '\n', 'utf8');
  header.files['package.json'] = {
    size: newPkg.length,
    offset: String(cursor),
    integrity: integrity(newPkg),
  };
  appended.push(newPkg);

  const out = serialize(header, Buffer.concat([arc.data, ...appended]));
  swapFileVerified(file, out, 'original', origMainContent, originalMain);
  return {
    changed: true,
    previousState: state,
    state: 'original',
  };
}

if (require.main === module) {
  const [cmd, file, boot] = process.argv.slice(2);
  try {
    if (cmd === 'status' && file) {
      console.log(status(file).state);
    } else if (cmd === 'version' && file) {
      console.log(getAppVersion(file));
    } else if (cmd === 'patch' && file && boot) {
      const res = patch(file, boot);
      console.log(`patched ${file} (was ${res.previousState}, +${res.deltaBytes} bytes)`);
    } else if (cmd === 'unpatch' && file) {
      const res = unpatch(file);
      console.log(res.changed ? `unpatched ${file} (was ${res.previousState})` : `${file} is already original`);
    } else {
      console.error('usage: patch-asar.js status|version|patch|unpatch <app.asar> [harness-boot.js]');
      process.exit(2);
    }
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  status,
  getAppVersion,
  patch,
  unpatch,
};
