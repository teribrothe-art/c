#!/usr/bin/env node
/**
 * 로컬 Expo 웹 탭 새로고침 (에이전트·워처·수동 실행)
 * 1) Chrome/Edge --remote-debugging-port=9222 이면 CDP로 hard reload
 * 2) --open / --open-once 일 때만 기본 브라우저 새 창 열기 (그 외에는 열지 않음)
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const markerFile = path.join(projectRoot, '.cursor', 'dev-browser-opened');
const args = new Set(process.argv.slice(2));

const port = Number(process.env.PORT || 8081);
const host = process.env.HOST || '127.0.0.1';
const pathName = process.env.DEV_BROWSER_PATH || '/test-login';
const debugPorts = (process.env.CHROME_DEBUG_PORTS || process.env.CHROME_DEBUG_PORT || '9222')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);

function buildBaseUrl() {
  return `http://${host}:${port}${pathName.startsWith('/') ? pathName : `/${pathName}`}`;
}

function buildOpenUrl() {
  const base = buildBaseUrl();
  return `${base}${base.includes('?') ? '&' : '?'}_r=${Date.now()}`;
}

function shouldOpenBrowser() {
  if (args.has('--open')) {
    return true;
  }

  if (args.has('--open-once')) {
    try {
      fs.readFileSync(markerFile, 'utf8');
      return false;
    } catch {
      return true;
    }
  }

  return false;
}

function markBrowserOpened() {
  fs.mkdirSync(path.dirname(markerFile), { recursive: true });
  fs.writeFileSync(markerFile, new Date().toISOString(), 'utf8');
}

function isDevTabUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }

  return (
    url.includes(`://${host}:${port}`) ||
    url.includes(`://localhost:${port}`) ||
    url.includes(`://127.0.0.1:${port}`)
  );
}

async function reloadTabViaCdp(tab, debugPort) {
  if (!tab?.webSocketDebuggerUrl || typeof WebSocket === 'undefined') {
    return false;
  }

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('CDP timeout'));
    }, 3000);

    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Page.reload',
          params: { ignoreCache: true },
        }),
      );
    });

    ws.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data));

        if (payload.id === 1) {
          clearTimeout(timer);
          ws.close();
          resolve(undefined);
        }
      } catch {
        // ignore non-json frames
      }
    });

    ws.addEventListener('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

  console.log(`Reloaded via CDP (port ${debugPort}): ${tab.url}`);
  return true;
}

async function reloadViaCdp() {
  for (const debugPort of debugPorts) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json`, {
        signal: AbortSignal.timeout(1200),
      });

      if (!response.ok) {
        continue;
      }

      const tabs = await response.json();
      const devTabs = tabs.filter((entry) => isDevTabUrl(entry.url));

      if (devTabs.length === 0) {
        continue;
      }

      for (const tab of devTabs) {
        try {
          await reloadTabViaCdp(tab, debugPort);
        } catch {
          // try next tab
        }
      }

      return true;
    } catch {
      // try next debug port
    }
  }

  return false;
}

async function openInBrowser(url) {
  if (process.platform === 'win32') {
    await execFileAsync(
      'powershell',
      ['-NoProfile', '-Command', `Start-Process '${url.replace(/'/g, "''")}'`],
      { windowsHide: true },
    );
    return;
  }

  if (process.platform === 'darwin') {
    await execFileAsync('open', [url]);
    return;
  }

  await execFileAsync('xdg-open', [url]);
}

async function main() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    await fetch(`http://${host}:${port}/`, { signal: controller.signal });
    clearTimeout(timeout);
  } catch {
    console.log(`SKIP: dev server not ready at http://${host}:${port}/`);
    console.log('Start: npm run web  (Windows: scripts\\start-web.cmd)');
    process.exit(0);
  }

  const reloaded = await reloadViaCdp();

  if (reloaded) {
    return;
  }

  if (shouldOpenBrowser()) {
    const url = args.has('--open-once') ? buildBaseUrl() : buildOpenUrl();
    await openInBrowser(url);
    markBrowserOpened();
    console.log(`Opened: ${url}`);
    console.log('다음부터는 같은 탭 새로고침만 사용합니다.');
    return;
  }

  console.log('Refresh skipped: 열린 개발 탭을 찾지 못했습니다.');
  console.log('이미 연 탭에서 Ctrl+Shift+R 로 새로고침하거나, Chrome/Edge를');
  console.log('--remote-debugging-port=9222 로 실행하면 자동 새로고침됩니다.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
