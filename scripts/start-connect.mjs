#!/usr/bin/env node
/**
 * Expo Go 접속 — 터널(cloudflared/ngrok) + Metro 자동 시작
 *
 * 터미널 1: npm run start:connect
 * 터미널 2: npm run share
 *
 * 원클릭: npm run connect
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatLanHostHint, pickLanHost } from './lib/pick-lan-host.mjs';
import { loadEnvFile } from './lib/load-env.mjs';
import { startTunnel } from './lib/tunnel-provider.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const policyPath = path.join(projectRoot, 'policy.yaml');
const port = Number(process.env.PORT || 8081);

loadEnvFile(projectRoot);

const tunnelMode = process.argv.includes('--tunnel') || process.argv.includes('--phone');
const wifiOnly = process.argv.includes('--wifi');

function startMetro({ hostname, proxyUrl }) {
  const env = {
    ...process.env,
    CI: 'false',
    REACT_NATIVE_PACKAGER_HOSTNAME: hostname,
  };

  if (proxyUrl) {
    env.EXPO_PACKAGER_PROXY_URL = proxyUrl;
  }

  const args = ['expo', 'start', '--clear', '--port', String(port), '--lan'];

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

async function main() {
  const lan = pickLanHost();
  const hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || lan?.address || '127.0.0.1';

  console.log('=== Expo Go 접속 Metro ===\n');
  console.log(formatLanHostHint(lan));

  let proxyUrl = process.env.EXPO_PACKAGER_PROXY_URL?.trim() || null;

  if (!wifiOnly && tunnelMode && !proxyUrl) {
    console.log('');
    const tunnel = await startTunnel({
      projectRoot,
      port,
      policyPath,
      prefer: process.env.TUNNEL_PROVIDER || 'auto',
    });

    proxyUrl = tunnel?.publicUrl ?? null;
  }

  if (!wifiOnly && tunnelMode && !proxyUrl) {
    console.log('터널 실패 → LAN 모드 (같은 Wi‑Fi 필요)\n');
    console.log('다른 네트워크: npm run connect (cloudflared 자동)\n');
  } else if (!wifiOnly && !tunnelMode) {
    console.log('\n다른 네트워크: npm run connect\n');
  }

  const metro = startMetro({ hostname, proxyUrl });

  metro.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
