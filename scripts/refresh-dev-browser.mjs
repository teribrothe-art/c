#!/usr/bin/env node
/**
 * 로컬 Expo 웹 탭 새로고침 (에이전트·워처·수동 실행)
 * 1) Chrome --remote-debugging-port=9222 이면 CDP로 hard reload
 * 2) 아니면 캐시 무효화 URL로 기본 브라우저 열기
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const port = Number(process.env.PORT || 8081);
const host = process.env.HOST || '127.0.0.1';
const path = process.env.DEV_BROWSER_PATH || '/test-login';
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9222);

function buildUrl() {
  const base = `http://${host}:${port}${path.startsWith('/') ? path : `/${path}`}`;
  return `${base}${base.includes('?') ? '&' : '?'}_r=${Date.now()}`;
}

async function reloadViaCdp() {
  try {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json`, {
      signal: AbortSignal.timeout(1200),
    });

    if (!response.ok) {
      return false;
    }

    const tabs = await response.json();
    const tab = tabs.find(
      (entry) =>
        typeof entry.url === 'string' &&
        (entry.url.includes(`:${port}`) || entry.url.includes(host)),
    );

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

    console.log(`Reloaded via Chrome CDP (port ${debugPort}): ${tab.url}`);
    return true;
  } catch {
    return false;
  }
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
  const url = buildUrl();

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

  if (!reloaded) {
    await openInBrowser(url);
    console.log(`Opened: ${url}`);
    console.log('Tip: hard reload in browser with Ctrl+Shift+R if the tab was already open.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
