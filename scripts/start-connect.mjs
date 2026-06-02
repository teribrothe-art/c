#!/usr/bin/env node
/**
 * Expo Go 접속 — LAN IP 자동 + ngrok v3 터널(가능 시) + Metro
 *
 * 터미널 1: npm run start:connect   (또는 start:phone)
 * 터미널 2: npm run share
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatLanHostHint, pickLanHost } from './lib/pick-lan-host.mjs';
import { fetchNgrokTunnel } from './lib/expo-go-share.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const policyPath = path.join(projectRoot, 'policy.yaml');
const port = Number(process.env.PORT || 8081);

const tunnelMode = process.argv.includes('--tunnel') || process.argv.includes('--phone');
const wifiOnly = process.argv.includes('--wifi');

function resolveNgrokBin() {
  const candidates = [process.env.NGROK_BIN, 'ngrok'].filter(Boolean);

  for (const candidate of candidates) {
    const check = spawnSync(candidate, ['http', '--help'], { encoding: 'utf8' });
    const help = `${check.stdout ?? ''}${check.stderr ?? ''}`;

    if (check.status === 0 && help.includes('--traffic-policy-file')) {
      return candidate;
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNgrok(timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const tunnel = await fetchNgrokTunnel();

    if (tunnel?.public_url) {
      return tunnel.public_url;
    }

    await sleep(800);
  }

  return null;
}

function startNgrokSidecar(ngrokBin) {
  const args = ['http', String(port), '--host-header=rewrite'];

  if (fs.existsSync(policyPath)) {
    args.push('--traffic-policy-file', policyPath);
  }

  if (process.env.NGROK_REGION) {
    args.push('--region', process.env.NGROK_REGION);
  }

  console.log(`ngrok 시작: ${ngrokBin} ${args.join(' ')}\n`);

  return spawn(ngrokBin, args, {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
}

function startMetro({ hostname, proxyUrl, useTunnelFlag }) {
  const env = {
    ...process.env,
    CI: 'false',
    REACT_NATIVE_PACKAGER_HOSTNAME: hostname,
  };

  if (proxyUrl) {
    env.EXPO_PACKAGER_PROXY_URL = proxyUrl;
  }

  const args = ['expo', 'start', '--clear', '--port', String(port)];

  if (useTunnelFlag) {
    args.push('--tunnel');
  } else {
    args.push('--lan');
  }

  console.log(`Metro: npx ${args.join(' ')}`);

  if (proxyUrl) {
    console.log(`EXPO_PACKAGER_PROXY_URL=${proxyUrl}`);
  }

  console.log(`REACT_NATIVE_PACKAGER_HOSTNAME=${hostname}\n`);
  console.log('다른 터미널: npm run share\n');

  return spawn('npx', args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });
}

async function tryStandaloneNgrok() {
  const ngrokBin = resolveNgrokBin();

  if (!ngrokBin) {
    return null;
  }

  let sidecar;

  try {
    sidecar = startNgrokSidecar(ngrokBin);
  } catch {
    return null;
  }

  sidecar.unref();

  sidecar.stderr?.on('data', (chunk) => {
    const text = chunk.toString();

    if (/ERR_NGROK|authentication failed|authtoken/i.test(text)) {
      console.log('\nngrok 인증 필요: ngrok config add-authtoken YOUR_TOKEN\n');
    }
  });

  const publicUrl = await waitForNgrok();

  if (!publicUrl) {
    try {
      sidecar.kill();
    } catch {
      // ignore
    }

    return null;
  }

  console.log(`ngrok 터널: ${publicUrl}\n`);
  return publicUrl;
}

async function main() {
  const lan = pickLanHost();
  const hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || lan?.address || '127.0.0.1';

  console.log('=== Expo Go 접속 Metro ===\n');
  console.log(formatLanHostHint(lan));

  let proxyUrl = process.env.EXPO_PACKAGER_PROXY_URL?.trim() || null;

  if (!wifiOnly && tunnelMode && !proxyUrl) {
    console.log('\nngrok v3 터널 시도 중…');
    proxyUrl = await tryStandaloneNgrok();
  }

  if (!wifiOnly && tunnelMode && !proxyUrl) {
    console.log('\nngrok v3 없음/실패 → LAN 모드로 시작 (같은 Wi‑Fi 필요)');
    console.log('다른 네트워크 접속:');
    console.log('  1) https://ngrok.com/download 설치');
    console.log('  2) ngrok config add-authtoken YOUR_TOKEN');
    console.log('  3) npm run start:connect 다시 실행\n');
  } else if (!wifiOnly && !tunnelMode) {
    console.log('\n다른 네트워크: npm run start:connect\n');
  }

  const metro = startMetro({
    hostname,
    proxyUrl,
    useTunnelFlag: false,
  });

  metro.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
