#!/usr/bin/env node
/**
 * Windows/macOS/Linux 공통 — Expo 웹 개발 서버
 * npm run web / web:clear
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const clearCache = process.argv.includes('--clear');
const watchRefresh =
  !process.argv.includes('--no-watch-refresh') && process.env.WATCH_REFRESH !== '0';
const args = ['expo', 'start', '--web', '--port', '8081'];

if (clearCache) {
  args.push('--clear');
}

if (watchRefresh) {
  const watcher = spawn(process.execPath, ['scripts/watch-web-refresh.mjs'], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });

  watcher.unref();
  console.log('[start-web] watch-refresh: app/lib/src 저장 시 브라우저 새로고침');
}

const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    BROWSER: 'none',
    CI: 'false',
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
