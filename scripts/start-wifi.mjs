#!/usr/bin/env node
/**
 * 같은 Wi‑Fi 접속 — 올바른 LAN IP로 Metro 시작
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatLanHostHint, pickLanHost } from './lib/pick-lan-host.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8081);

function main() {
  const lan = pickLanHost();
  const hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || lan?.address;

  console.log('=== Expo Go LAN Metro ===\n');
  console.log(formatLanHostHint(lan));
  console.log(`포트: ${port}`);
  console.log('PC·폰이 같은 Wi‑Fi, 게스트/VPN 끄기\n');
  console.log('다른 터미널: npm run share\n');

  const env = {
    ...process.env,
    CI: 'false',
    REACT_NATIVE_PACKAGER_HOSTNAME: hostname,
  };

  const child = spawn(
    'npx',
    ['expo', 'start', '--lan', '--clear', '--port', String(port)],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32',
    },
  );

  child.on('exit', (code) => process.exit(code ?? 0));
}

main();
