#!/usr/bin/env node
/**
 * 재부팅·로그인 후 Expo 웹 개발 서버 자동 기동
 * 사용: node scripts/dev-auto-start.mjs --boot [--open-browser] [--no-browser]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isDevServerReady } from './lib/dev-server-health.mjs';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const bootMode = args.has('--boot');
const openBrowser =
  args.has('--open-browser') || (bootMode && !args.has('--no-browser'));

const logDir = path.join(projectRoot, '.cursor');
const logFile = path.join(logDir, 'dev-server.log');
const pidFile = path.join(logDir, 'dev-server.pid');

function timestamp() {
  return new Date().toISOString();
}

function appendLog(message) {
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(logFile, `[${timestamp()}] ${message}\n`, 'utf8');
}

function readPid() {
  try {
    const raw = fs.readFileSync(pidFile, 'utf8').trim();
    const pid = Number(raw);

    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForServer(maxWaitMs = 180_000) {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    if (await isDevServerReady()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return false;
}

function startServerDetached() {
  fs.mkdirSync(logDir, { recursive: true });
  const logHandle = fs.openSync(logFile, 'a');

  const child = spawn(
    process.execPath,
    [path.join(projectRoot, 'scripts', 'start-web.mjs'), '--no-watch-refresh'],
    {
      cwd: projectRoot,
      detached: true,
      stdio: ['ignore', logHandle, logHandle],
      env: {
        ...process.env,
        CI: 'false',
      },
      windowsHide: true,
    },
  );

  child.unref();
  fs.writeFileSync(pidFile, String(child.pid), 'utf8');
  appendLog(`Metro started (pid ${child.pid})`);

  return child.pid;
}

function openTestLoginPage() {
  const child = spawn(process.execPath, [path.join(projectRoot, 'scripts', 'refresh-dev-browser.mjs')], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });

  child.unref();
  appendLog('Opened test-login in browser');
}

async function main() {
  appendLog(`dev-auto-start ${[...args].join(' ') || '(default)'}`);

  if (await isDevServerReady()) {
    appendLog('Dev server already responding on :8081');

    if (openBrowser) {
      openTestLoginPage();
    }

    return;
  }

  const existingPid = readPid();

  if (existingPid && isProcessRunning(existingPid)) {
    appendLog(`Waiting for existing Metro pid ${existingPid}`);

    if (await waitForServer()) {
      appendLog('Existing Metro became ready');

      if (openBrowser) {
        openTestLoginPage();
      }

      return;
    }

    appendLog(`Metro pid ${existingPid} did not become ready — starting new process`);
  }

  startServerDetached();

  if (await waitForServer()) {
    appendLog('Dev server ready');

    if (openBrowser) {
      openTestLoginPage();
    }

    return;
  }

  appendLog('Dev server did not respond within timeout — see dev-server.log');
  process.exitCode = 1;
}

main().catch((error) => {
  appendLog(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
