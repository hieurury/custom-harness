#!/usr/bin/env node
'use strict';
/*
 * Antigravity Harness — cross-platform minimal app.asar patcher.
 *
 * Non-destructively appends dist/harnessBoot.js and points package.json "main"
 * to it (or restores dist/main.js on unpatch). All original entry bytes stay
 * untouched in the ASAR data section.
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
const crypto = require('crypto');

const BLOCK = 4 * 1024 * 1024;
const BOOT_MAIN = 'dist/harnessBoot.js';
const LEGACY_BOOT_MAIN = 'dist/glassBoot.js';
const ORIG_MAIN = 'dist/main.js';

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

function status(file) {
  const arc = readArchive(file);
  const pkgEntry = arc.header.files && arc.header.files['package.json'];
  if (!pkgEntry) throw new Error(`Missing package.json inside ${file}`);
  const pkg = JSON.parse(fileContent(arc, pkgEntry).toString('utf8'));
  const distFiles = (arc.header.files.dist && arc.header.files.dist.files) || {};

  let state = 'original';
  if (pkg.main === BOOT_MAIN && distFiles['harnessBoot.js']) {
    state = 'patched';
  } else if (pkg.main === LEGACY_BOOT_MAIN && distFiles['glassBoot.js']) {
    state = 'legacy-patched';
  }

  return { arc, pkg, state };
}

function getAppVersion(file) {
  const { pkg } = status(file);
  return pkg.version || 'unknown';
}

function swapFileVerified(file, outBuffer, expectedState, origMainContent) {
  const tmp = `${file}.harness-tmp-${process.pid}`;
  try {
    const opts = process.platform === 'win32' ? undefined : { mode: 0o644 };
    fs.writeFileSync(tmp, outBuffer, opts);

    const check = status(tmp);
    if (check.state !== expectedState) {
      throw new Error(`ASAR verification failed: expected ${expectedState}, got ${check.state}`);
    }
    const newMainEntry = check.arc.header.files.dist && check.arc.header.files.dist.files['main.js'];
    if (!newMainEntry) throw new Error('ASAR verification failed: dist/main.js missing');
    const mainNew = fileContent(check.arc, newMainEntry);
    if (!origMainContent.equals(mainNew)) {
      throw new Error('ASAR verification failed: dist/main.js changed unexpectedly');
    }

    try {
      fs.renameSync(tmp, file);
    } catch (err) {
      if (err && (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES')) {
        throw new Error(
          `Cannot replace ${file} (${err.code}). Please fully close Antigravity and check write permissions.`
        );
      }
      throw err;
    }
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function patch(file, bootFile) {
  if (!bootFile || !fs.existsSync(bootFile)) {
    throw new Error(`Boot file not found: ${bootFile}`);
  }
  const { arc, pkg, state } = status(file);
  if (state === 'original' && pkg.main !== ORIG_MAIN) {
    throw new Error(`Unexpected package.json main: ${pkg.main}`);
  }

  const origMainEntry = arc.header.files.dist && arc.header.files.dist.files['main.js'];
  if (!origMainEntry) throw new Error(`Missing dist/main.js in ${file}`);
  const origMainContent = fileContent(arc, origMainEntry);

  const header = JSON.parse(JSON.stringify(arc.header));
  if (header.files.dist && header.files.dist.files && header.files.dist.files['glassBoot.js']) {
    delete header.files.dist.files['glassBoot.js'];
  }

  const appended = [];
  let cursor = arc.data.length;
  const add = (content) => {
    const entry = { size: content.length, offset: String(cursor), integrity: integrity(content) };
    appended.push(content);
    cursor += content.length;
    return entry;
  };

  const newPkg = Buffer.from(JSON.stringify({ ...pkg, main: BOOT_MAIN }, null, 2) + '\n', 'utf8');
  header.files['package.json'] = add(newPkg);
  header.files.dist.files['harnessBoot.js'] = add(fs.readFileSync(bootFile));

  const out = serialize(header, Buffer.concat([arc.data, ...appended]));
  swapFileVerified(file, out, 'patched', origMainContent);
  return {
    previousState: state,
    state: 'patched',
    deltaBytes: out.length - arc.buf.length,
  };
}

function unpatch(file) {
  const { arc, pkg, state } = status(file);
  if (state === 'original') {
    return { changed: false, previousState: 'original', state: 'original' };
  }

  const origMainEntry = arc.header.files.dist && arc.header.files.dist.files['main.js'];
  if (!origMainEntry) throw new Error(`Missing dist/main.js in ${file}`);
  const origMainContent = fileContent(arc, origMainEntry);

  const header = JSON.parse(JSON.stringify(arc.header));
  if (header.files.dist && header.files.dist.files) {
    delete header.files.dist.files['harnessBoot.js'];
    delete header.files.dist.files['glassBoot.js'];
  }

  const appended = [];
  let cursor = arc.data.length;
  const newPkg = Buffer.from(JSON.stringify({ ...pkg, main: ORIG_MAIN }, null, 2) + '\n', 'utf8');
  header.files['package.json'] = {
    size: newPkg.length,
    offset: String(cursor),
    integrity: integrity(newPkg),
  };
  appended.push(newPkg);

  const out = serialize(header, Buffer.concat([arc.data, ...appended]));
  swapFileVerified(file, out, 'original', origMainContent);
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
