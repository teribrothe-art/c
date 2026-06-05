#!/usr/bin/env node
/**
 * app / lib / src 저장 시 브라우저 새로고침 (Expo 웹 개발용)
 * start-web.mjs 가 백그라운드로 실행
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const watchRoots = ['app', 'lib', 'src'].map((dir) => path.join(root, dir));
const debounceMs = Number(process.env.WATCH_REFRESH_DEBOUNCE_MS || 450);
const ignorePattern = /(^|[\\/])(\.git|node_modules|\.expo|dist|build)([\\/]|$)/;

let timer = null;
let refreshing = false;

function shouldIgnore(filePath) {
  return ignorePattern.test(filePath);
}

function scheduleRefresh(changedPath) {
  if (shouldIgnore(changedPath)) {
    return;
  }

  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(() => {
    timer = null;

    if (refreshing) {
      return;
    }

    refreshing = true;
    const child = spawn(process.execPath, ['scripts/refresh-dev-browser.mjs'], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', () => {
      refreshing = false;
    });
  }, debounceMs);
}

function watchDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  fs.watch(dir, { recursive: true }, (_event, filename) => {
    if (!filename) {
      scheduleRefresh(dir);
      return;
    }

    scheduleRefresh(path.join(dir, filename));
  });

  console.log(`[watch-refresh] ${path.relative(root, dir)}/`);
}

console.log('[watch-refresh] file changes → browser refresh');
watchRoots.forEach(watchDir);
