#!/usr/bin/env node
/**
 * 터널·Metro 접속 검증 + 브라우저 자동 열기
 * npm run verify:connect
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFile } from './lib/load-env.mjs';
import { fetchActiveTunnel, startTunnel } from './lib/tunnel-provider.mjs';
import {
  publicUrlToExpUrl,
  resolveExpoGoShareUrl,
  waitForMetro,
} from './lib/expo-go-share.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const policyPath = path.join(projectRoot, 'policy.yaml');
const port = Number(process.env.PORT || 8081);
const host = process.env.HOST || '127.0.0.1';
const maxAttempts = Number(process.env.CONNECT_VERIFY_ATTEMPTS || 5);
const openBrowser = !process.argv.includes('--no-open');

loadEnvFile(projectRoot);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCheck(url, { expectText, minBytes = 0, timeoutMs = 20_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    clearTimeout(timer);

    const ok =
      response.ok &&
      text.length >= minBytes &&
      (expectText ? text.includes(expectText) : true);

    return { ok, status: response.status, bytes: text.length, text: text.slice(0, 200) };
  } catch (error) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      bytes: 0,
      text: error instanceof Error ? error.message : String(error),
    };
  }
}

function openInBrowser(targetPathOrUrl) {
  const platform = process.platform;

  if (platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', targetPathOrUrl], {
      detached: true,
      stdio: 'ignore',
    }).unref();
    return;
  }

  if (platform === 'darwin') {
    spawn('open', [targetPathOrUrl], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  const chrome = spawnSync('command', ['-v', 'google-chrome'], { encoding: 'utf8' });
  const bin =
    chrome.status === 0
      ? 'google-chrome'
      : fs.existsSync('/usr/bin/google-chrome')
        ? '/usr/bin/google-chrome'
        : 'xdg-open';

  spawn(bin, bin === 'xdg-open' ? [targetPathOrUrl] : ['--new-window', targetPathOrUrl], {
    detached: true,
    stdio: 'ignore',
  }).unref();
}

async function headlessBrowserCheck(url) {
  const screenshotPath = path.join(projectRoot, 'connect-verify.png');
  const chromeCandidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean);

  let chromeBin = null;

  for (const candidate of chromeCandidates) {
    if (fs.existsSync(candidate)) {
      chromeBin = candidate;
      break;
    }
  }

  if (!chromeBin) {
    const which = spawnSync('command', ['-v', 'google-chrome'], { encoding: 'utf8' });
    if (which.status === 0) {
      chromeBin = 'google-chrome';
    }
  }

  if (!chromeBin) {
    return { ok: false, error: 'chrome not found' };
  }

  const result = spawnSync(
    chromeBin,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,720',
      `--screenshot=${screenshotPath}`,
      url,
    ],
    { encoding: 'utf8', timeout: 45_000 },
  );

  const screenshotOk = fs.existsSync(screenshotPath) && fs.statSync(screenshotPath).size > 1000;

  return {
    ok: result.status === 0 && screenshotOk,
    status: result.status,
    screenshotPath: screenshotOk ? screenshotPath : null,
    stderr: (result.stderr || '').slice(0, 200),
  };
}

async function verifyOnce(attempt) {
  console.log(`\n=== 접속 검증 (${attempt}/${maxAttempts}) ===\n`);

  const metroUp = await waitForMetro({ port, host, timeoutMs: 8_000 });

  if (!metroUp) {
    console.log('Metro: FAIL (미실행)');
    return { ok: false, reason: 'metro-down' };
  }

  console.log('Metro /status: OK');

  let tunnel = await fetchActiveTunnel(projectRoot);

  if (!tunnel?.publicUrl) {
    console.log('터널 없음 → cloudflared 시작…');
    tunnel = await startTunnel({
      projectRoot,
      port,
      policyPath,
      prefer: 'cloudflared',
    });
  }

  if (!tunnel?.publicUrl) {
    console.log('터널: FAIL');
    return { ok: false, reason: 'tunnel-down' };
  }

  const httpsUrl = tunnel.publicUrl.replace(/\/$/, '');
  const expUrl = publicUrlToExpUrl(httpsUrl);

  console.log(`터널 (${tunnel.provider}): ${httpsUrl}`);
  console.log(`Expo Go: ${expUrl}`);

  const statusCheck = await fetchCheck(`${httpsUrl}/status`, {
    expectText: 'packager-status:running',
  });
  console.log(`브라우저 /status: ${statusCheck.ok ? 'OK' : 'FAIL'} (HTTP ${statusCheck.status})`);

  const rootCheck = await fetchCheck(`${httpsUrl}/`, { minBytes: 500 });
  console.log(`브라우저 /: ${rootCheck.ok ? 'OK' : 'FAIL'} (HTTP ${rootCheck.status}, ${rootCheck.bytes} bytes)`);

  const bundleCheck = await fetchCheck(
    `${httpsUrl}/node_modules/expo-router/entry.bundle?platform=ios&dev=true&minify=false`,
    { expectText: '__BUNDLE_START_TIME__', minBytes: 50_000, timeoutMs: 120_000 },
  );
  console.log(`앱 번들: ${bundleCheck.ok ? 'OK' : 'FAIL'} (${bundleCheck.bytes} bytes)`);

  let shareResult = null;

  try {
    shareResult = await resolveExpoGoShareUrl('ios');
    console.log(`share URL: ${shareResult.url}`);
  } catch (error) {
    console.log(`share: FAIL (${error instanceof Error ? error.message : String(error)})`);
  }

  const browser = await headlessBrowserCheck(httpsUrl);
  console.log(
    `헤드리스 브라우저: ${browser.ok ? 'OK' : 'FAIL'}${browser.status !== undefined ? ` (exit ${browser.status})` : ''}${browser.error ? ` ${browser.error}` : ''}`,
  );

  if (browser.screenshotPath && fs.existsSync(browser.screenshotPath)) {
    console.log(`스크린샷: ${browser.screenshotPath}`);
  }

  const ok =
    statusCheck.ok &&
    rootCheck.ok &&
    bundleCheck.ok &&
    Boolean(shareResult?.classification?.shareable);

  if (ok && openBrowser) {
    const shareHtml = path.join(projectRoot, 'expo-go-share.html');

    if (fs.existsSync(shareHtml)) {
      console.log(`\n브라우저 열기: ${shareHtml}`);
      openInBrowser(shareHtml);
    }

    console.log(`브라우저 열기: ${httpsUrl}`);
    openInBrowser(httpsUrl);
  }

  return {
    ok,
    httpsUrl,
    expUrl,
    provider: tunnel.provider,
    browser,
  };
}

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await verifyOnce(attempt);

    if (result.ok) {
      console.log('\n✅ 접속 검증 성공 — 브라우저·Expo Go 모두 사용 가능\n');
      console.log(`HTTPS: ${result.httpsUrl}`);
      console.log(`Expo Go: ${result.expUrl}`);
      console.log('QR: expo-go-qr.png (npm run share 로 갱신)\n');
      process.exit(0);
    }

    console.log(`\n재시도 ${attempt}/${maxAttempts}… (${result.reason ?? 'check failed'})`);
    await sleep(3000);
  }

  console.log('\nFAIL: 접속 검증 실패. npm run connect 후 다시 시도하세요.\n');
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
