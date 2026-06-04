#!/usr/bin/env node
/**
 * 작업 종료 시 GitHub 원격 저장소로 백업 (commit + push)
 * 원격: https://github.com/teribrothe-art/c.git
 *
 * 수동 실행: npm run backup
 * Cursor 세션 종료 시: .cursor/hooks.json → sessionEnd
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REMOTE_URL = 'https://github.com/teribrothe-art/c.git';
const DEFAULT_BRANCH = 'main';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_DIR = path.join(ROOT, '.cursor');
const LOG_FILE = path.join(LOG_DIR, 'backup.log');

function log(line) {
  const stamp = new Date().toISOString();
  const msg = `[${stamp}] ${line}`;
  console.log(msg);
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `${msg}\n`, 'utf8');
  } catch {
    // ignore log write errors
  }
}

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function gitOk(args) {
  try {
    git(args);
    return true;
  } catch {
    return false;
  }
}

function ensureRepo() {
  if (!fs.existsSync(path.join(ROOT, '.git'))) {
    log('git init');
    git(['init']);
    git(['branch', '-M', DEFAULT_BRANCH]);
  }

  const remotes = git(['remote']);
  if (!remotes.split('\n').includes('origin')) {
    log(`remote add origin ${REMOTE_URL}`);
    git(['remote', 'add', 'origin', REMOTE_URL]);
  } else {
    const url = git(['remote', 'get-url', 'origin']);
    if (url !== REMOTE_URL) {
      log(`remote set-url origin ${REMOTE_URL}`);
      git(['remote', 'set-url', 'origin', REMOTE_URL]);
    }
  }
}

function currentBranch() {
  try {
    return git(['branch', '--show-current']) || DEFAULT_BRANCH;
  } catch {
    return DEFAULT_BRANCH;
  }
}

function hasUpstream(branch) {
  try {
    git(['rev-parse', '--abbrev-ref', `@{u}`]);
    return true;
  } catch {
    return false;
  }
}

function syncWithRemote(branch) {
  if (!gitOk(['fetch', 'origin', branch])) {
    log(`fetch origin ${branch} skipped (new remote or offline)`);
    return;
  }

  const local = git(['rev-parse', branch]);
  let remoteRef = null;
  try {
    remoteRef = git(['rev-parse', `origin/${branch}`]);
  } catch {
    log(`no origin/${branch} yet — first push`);
    return;
  }

  if (local === remoteRef) {
    return;
  }

  const mergeBase = git(['merge-base', local, remoteRef]);
  if (mergeBase === remoteRef) {
    log('local ahead of origin — push only');
    return;
  }

  if (mergeBase === local) {
    log('behind origin — fast-forward pull');
    git(['pull', '--ff-only', 'origin', branch]);
    return;
  }

  log('diverged history — rebase onto origin');
  git(['pull', '--rebase', 'origin', branch]);
}

function commitIfNeeded() {
  git(['add', '-A']);
  const status = git(['status', '--porcelain']);
  if (!status) {
    log('no changes to commit');
    return false;
  }

  const now = new Date();
  const label = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const message = `backup: ${label}`;
  git(['commit', '-m', message]);
  log(`committed: ${message}`);
  return true;
}

function push(branch) {
  if (!hasUpstream(branch)) {
    git(['push', '-u', 'origin', branch]);
  } else {
    git(['push', 'origin', branch]);
  }
  log(`pushed to origin/${branch}`);
}

function main() {
  const quiet = process.argv.includes('--quiet');
  if (quiet) {
    // sessionEnd hook: stdout only on success/failure summary
  }

  try {
    ensureRepo();
    const branch = currentBranch();
    syncWithRemote(branch);
    commitIfNeeded();
    push(branch);
    log('backup OK');
    process.exit(0);
  } catch (err) {
    const detail =
      err?.stderr?.toString?.() ||
      err?.stdout?.toString?.() ||
      err?.message ||
      String(err);
    log(`backup FAILED: ${detail.trim()}`);
    process.exit(quiet ? 0 : 1);
  }
}

main();
