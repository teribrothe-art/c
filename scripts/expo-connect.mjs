#!/usr/bin/env node
/**
 * Expo Go 연합 접속 CLI
 *
 * npm run connect          — 모든 서버·터널·LAN 탐색
 * npm run start:connect    — Metro + 릴레이 자동 시작
 * npm run share:connect    — 최적 URL·QR 생성
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import QRCode from 'qrcode';

import {
  loadConnectConfig,
  probeAllFederationHosts,
  readConnectManifest,
  resolveBestExpoEndpoint,
  startNgrokRelay,
  waitForLocalMetro,
  writeConnectManifest,
} from './lib/expo-connect-federation.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const command = process.argv[2] ?? 'probe';

async function cmdProbe() {
  const config = loadConnectConfig();

  console.log('=== Expo 연합 접속 탐색 ===\n');
  console.log(`전략: ${config.strategies.join(' → ')}\n`);

  const federation = await probeAllFederationHosts(config);
  const resolved = await resolveBestExpoEndpoint();

  console.log('--- 등록된 Metro 서버 ---\n');

  for (const host of federation) {
    const status = host.running ? `OK (${host.mode})` : 'OFFLINE';
    console.log(`[${host.label ?? host.id}] ${host.host}:${host.port} — ${status}`);

    if (host.expoUrl) {
      console.log(`  URL: ${host.expoUrl}`);
    }
  }

  console.log('\n--- 후보 접속 경로 (점수순) ---\n');

  if (resolved.candidates.length === 0) {
    console.log('접속 가능한 경로 없음.');
    console.log('\n조치:');
    console.log('  npm run start:connect   (Metro + 릴레이 자동)');
    console.log('  또는 npm run start:phone → npm run share');
    process.exit(1);
  }

  for (const candidate of resolved.candidates) {
    const mark = candidate === resolved.best ? '★' : ' ';
    console.log(`${mark} [${candidate.score}] ${candidate.label ?? candidate.source} — ${candidate.mode}`);
    console.log(`    ${candidate.expoUrl}`);
  }

  console.log('\n--- 권장 ---\n');
  console.log(`Expo Go URL: ${resolved.best.expoUrl}`);
  console.log(`모드: ${resolved.best.mode} (${resolved.best.label ?? resolved.best.source})`);

  writeConnectManifest({
    best: resolved.best,
    candidates: resolved.candidates,
  });

  if (!resolved.best.shareable) {
    console.log('\n⚠️  휴대폰에서 접속 불가 URL입니다. npm run start:connect 로 릴레이를 켜세요.');
    process.exit(2);
  }

  process.exit(0);
}

async function writeShareFiles(url, meta) {
  const shareTxtPath = path.join(projectRoot, 'expo-go-share.txt');
  const shareHtmlPath = path.join(projectRoot, 'expo-go-share.html');
  const qrPngPath = path.join(projectRoot, 'expo-go-qr.png');

  const lines = [
    '# 헤어 다이어리 — Expo Go 연합 접속',
    `# 생성: ${new Date().toLocaleString('ko-KR')}`,
    `# 모드: ${meta.mode}`,
    `# 경로: ${meta.label ?? meta.source}`,
    '',
    url,
    '',
    '## 사용',
    'Expo Go → Scan QR 또는 URL 직접 입력',
    'Metro 유지: npm run start:connect 또는 npm run start:phone',
  ];

  fs.writeFileSync(shareTxtPath, lines.join('\n'), 'utf8');

  const qrDataUrl = await QRCode.toDataURL(url, { width: 360, margin: 2 });
  await QRCode.toFile(qrPngPath, url, { width: 320, margin: 2 });

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Expo Go 연합 접속</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fafafc; margin: 0; padding: 24px; max-width: 480px; margin-inline: auto; }
    h1 { font-size: 1.2rem; }
    img { width: 100%; max-width: 360px; background: #fff; padding: 12px; border-radius: 12px; }
    .url { word-break: break-all; background: #fff; border: 1px solid #e8e8f0; border-radius: 10px; padding: 12px; font-size: 0.9rem; }
    button { margin-top: 12px; padding: 12px 20px; border: 0; border-radius: 10px; background: #ff5a5f; color: #fff; font-weight: 800; font-size: 1rem; width: 100%; cursor: pointer; }
    .meta { color: #6b6b7b; font-size: 0.85rem; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>Expo Go 연합 접속</h1>
  <p class="meta">모드: <strong>${meta.mode}</strong> · ${meta.label ?? meta.source}</p>
  <img src="${qrDataUrl}" alt="Expo Go QR" />
  <p class="url" id="url">${url}</p>
  <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('url').textContent).then(()=>alert('복사됨'))">주소 복사</button>
</body>
</html>`;

  fs.writeFileSync(shareHtmlPath, html, 'utf8');

  return { shareTxtPath, shareHtmlPath, qrPngPath };
}

async function cmdShare() {
  console.log('=== Expo 연합 QR 생성 ===\n');

  const ready = await waitForLocalMetro();

  if (!ready) {
    console.log('FAIL: Metro 미실행 — npm run start:connect 먼저 실행\n');
    process.exit(1);
  }

  const manifest = readConnectManifest();
  let resolved = await resolveBestExpoEndpoint();

  if (!resolved.best?.shareable && process.env.EXPO_CONNECT_AUTO_RELAY !== 'false') {
    console.log('공유 가능 URL 없음 → Ngrok 릴레이 시도…\n');
    const relay = await startNgrokRelay(resolved.config.metroPort);

    if (relay.ok) {
      writeConnectManifest({
        best: relay,
        candidates: [relay, ...resolved.candidates],
        relay,
      });
      resolved = { ...resolved, best: relay };
    } else {
      console.log(`릴레이 실패: ${relay.error}\n`);
    }
  } else if (manifest?.best?.shareable) {
    resolved.best = manifest.best;
  }

  if (!resolved.best?.expoUrl) {
    console.log('FAIL: exp:// URL을 만들 수 없습니다.');
    process.exit(1);
  }

  const files = await writeShareFiles(resolved.best.expoUrl, resolved.best);

  console.log(`접속 URL: ${resolved.best.expoUrl}`);
  console.log(`모드: ${resolved.best.mode}`);
  console.log('\n파일:');
  console.log(`  ${files.qrPngPath}`);
  console.log(`  ${files.shareHtmlPath}`);
  console.log(`  ${files.shareTxtPath}`);

  if (!resolved.best.shareable) {
    console.log('\n⚠️  이 URL은 휴대폰에서 안 될 수 있습니다.');
    process.exit(2);
  }

  console.log('\n✅ Expo Go에서 QR 스캔 또는 URL 입력');
  process.exit(0);
}

async function cmdStart() {
  const config = loadConnectConfig();
  const port = config.metroPort;

  console.log('=== Expo 연합 서버 시작 ===\n');
  console.log('1) Metro (LAN) 기동');
  console.log('2) 접속 경로 자동 탐색 (터널·ngrok·LAN·원격 Metro)\n');

  const metro = spawn('npx', ['expo', 'start', '--lan', '--clear', '--port', String(port)], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });

  const onExit = () => {
    metro.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', onExit);
  process.on('SIGTERM', onExit);

  const ready = await waitForLocalMetro(port, 180_000);

  if (!ready) {
    console.log('\nFAIL: Metro가 3분 안에 뜨지 않았습니다.');
    metro.kill('SIGTERM');
    process.exit(1);
  }

  console.log('\nMetro OK — 연합 접속 경로 탐색 중…\n');

  let resolved = await resolveBestExpoEndpoint();
  let relay = null;

  if (!resolved.best?.shareable || resolved.best.mode === 'private') {
    console.log('터널/LAN URL만 감지 — Ngrok 릴레이 시도…');
    relay = await startNgrokRelay(port);

    if (relay.ok) {
      console.log(`릴레이 OK: ${relay.publicUrl}`);
      resolved = {
        ...resolved,
        best: relay,
        candidates: [relay, ...resolved.candidates],
      };
    } else {
      console.log(`릴레이 실패: ${relay.error}`);
      console.log('같은 Wi-Fi면 LAN QR 사용 가능 — npm run share:connect');
    }
  }

  writeConnectManifest({
    best: resolved.best,
    candidates: resolved.candidates,
    relay: relay?.ok ? relay : null,
  });

  console.log('\n--- 연합 접속 요약 ---');
  console.log(`권장 URL: ${resolved.best?.expoUrl ?? '(없음)'}`);
  console.log(`모드: ${resolved.best?.mode ?? 'unknown'}`);
  console.log('\n다른 터미널: npm run share:connect  (QR 생성)');
  console.log('탐색만: npm run connect\n');

  metro.on('exit', (code) => process.exit(code ?? 0));
}

async function main() {
  switch (command) {
    case 'probe':
    case 'connect':
      await cmdProbe();
      break;
    case 'share':
      await cmdShare();
      break;
    case 'start':
      await cmdStart();
      break;
    default:
      console.log('사용: node scripts/expo-connect.mjs [probe|share|start]');
      process.exit(1);
  }
}

main();
