#!/usr/bin/env node
/**
 * Expo Go 원클릭 접속 — 터널 + Metro + share 자동
 *
 * npm run connect
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFile } from './lib/load-env.mjs';
import { formatLanHostHint, pickLanHost } from './lib/pick-lan-host.mjs';
import { startTunnel } from './lib/tunnel-provider.mjs';
import { waitForMetro } from './lib/expo-go-share.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const policyPath = path.join(projectRoot, 'policy.yaml');
const port = Number(process.env.PORT || 8081);

loadEnvFile(projectRoot);

function runScript(name, args = []) {
  return new Promise((resolve) => {
    const child = spawn('node', [path.join(__dirname, name), ...args], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => resolve(code ?? 0));
  });
}

function startMetroBackground({ hostname, proxyUrl }) {
  const env = {
    ...process.env,
    CI: 'false',
    REACT_NATIVE_PACKAGER_HOSTNAME: hostname,
  };

  if (proxyUrl) {
    env.EXPO_PACKAGER_PROXY_URL = proxyUrl;
  }

  return spawn(
    'npx',
    ['expo', 'start', '--clear', '--port', String(port), '--lan'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32',
    },
  );
}

async function main() {
  console.log('=== Expo Go 원클릭 접속 ===\n');

  await runScript('invalidate-connect-manifest.mjs');

  const lan = pickLanHost();
  const hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || lan?.address || '127.0.0.1';

  console.log(formatLanHostHint(lan));
  console.log('');

  let proxyUrl = process.env.EXPO_PACKAGER_PROXY_URL?.trim() || null;

  if (!proxyUrl) {
    const tunnel = await startTunnel({
      projectRoot,
      port,
      policyPath,
      prefer: process.env.TUNNEL_PROVIDER || 'auto',
    });

    proxyUrl = tunnel?.publicUrl ?? null;
  }

  if (!proxyUrl) {
    console.log('⚠️  터널 없음 — 같은 Wi‑Fi LAN 모드로 시작합니다.\n');
  }

  console.log('Metro 시작…\n');
  const metro = startMetroBackground({ hostname, proxyUrl });

  const ready = await waitForMetro({ port, timeoutMs: 120_000 });

  if (!ready) {
    console.log('\nFAIL: Metro가 2분 안에 뜨지 않았습니다.');
    metro.kill();
    process.exit(1);
  }

  console.log('\n공유 URL·QR 생성…\n');
  const shareCode = await runScript('share-expo-go.mjs');

  metro.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  if (shareCode !== 0) {
    console.log('\nMetro는 실행 중입니다. npm run share 로 다시 시도하세요.\n');
  } else {
    console.log('\n✅ 접속 준비 완료 — Expo Go에서 QR 스캔 (expo-go-qr.png)\n');
    console.log('Metro 종료: Ctrl+C\n');
  }

  await new Promise((resolve) => {
    metro.on('exit', (code) => resolve(code ?? 0));
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
