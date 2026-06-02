#!/usr/bin/env node
/**
 * PC에서 Expo Go 공유용 URL·QR·HTML 생성
 *
 * 1) 터미널 1: npm run start:phone
 * 2) 터미널 2: npm run share
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import QRCode from 'qrcode';

import {
  classifyExpoUrl,
  fetchNgrokTunnel,
  resolveExpoGoShareUrl,
  waitForMetro,
} from './lib/expo-go-share.mjs';
import { writeExpoConnectManifest } from './lib/write-expo-connect-manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const shareTxtPath = path.join(projectRoot, 'expo-go-share.txt');
const shareHtmlPath = path.join(projectRoot, 'expo-go-share.html');
const qrPngPath = path.join(projectRoot, 'expo-go-qr.png');

async function writeShareArtifacts(url, meta) {
  const lines = [
    '# 헤어 다이어리 — Expo Go 접속',
    `# 생성: ${new Date().toLocaleString('ko-KR')}`,
    `# 모드: ${meta.mode}`,
    '',
    url,
    '',
    '## 사용 방법',
    '1. 휴대폰에 Expo Go 설치 (SDK 56)',
    '2. Expo Go → Scan QR code → expo-go-qr.png 스캔',
    '   또는 Enter URL manually → 위 exp:// 주소 붙여넣기',
    '',
    '## PC에서 Metro 유지',
    '이 창을 닫지 말고 npm run start:phone 이 켜져 있어야 합니다.',
  ];

  fs.writeFileSync(shareTxtPath, lines.join('\n'), 'utf8');

  const qrDataUrl = await QRCode.toDataURL(url, { width: 360, margin: 2 });
  await QRCode.toFile(qrPngPath, url, { width: 320, margin: 2 });

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Expo Go 공유 — 헤어 다이어리</title>
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
  <h1>Expo Go 접속 (PC 공유)</h1>
  <p class="meta">모드: <strong>${meta.mode}</strong> · Metro: <code>npm run start:phone</code> 실행 중</p>
  <img src="${qrDataUrl}" alt="Expo Go QR" />
  <p class="url" id="url">${url}</p>
  <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('url').textContent).then(()=>alert('주소 복사됨'))">주소 복사</button>
  <p class="meta">Expo Go → Scan QR 또는 URL 직접 입력 후 앱에서 로그인하세요.</p>
</body>
</html>
`;
  fs.writeFileSync(shareHtmlPath, html, 'utf8');
}

async function main() {
  console.log('=== Expo Go PC 공유 설정 ===\n');
  console.log('Metro 대기 중… (npm run start:phone 이 다른 터미널에서 실행 중이어야 합니다)\n');

  const ready = await waitForMetro();

  if (!ready) {
    console.log('FAIL: Metro가 2분 안에 뜨지 않았습니다.\n');
    console.log('PC에서 순서대로 실행하세요:');
    console.log('  1) npm install');
    console.log('  2) cp .env.example .env');
    console.log('  3) npm run start:phone    ← 이 터미널은 켜 둔 채');
    console.log('  4) npm run share          ← 새 터미널');
    process.exit(1);
  }

  let resolved;

  try {
    resolved = await resolveExpoGoShareUrl('ios');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL: ${message}`);
    process.exit(1);
  }

  const { url, classification, ngrokPublicUrl, allPlatforms } = resolved;

  if (!url) {
    console.log('FAIL: exp:// URL을 받지 못했습니다. npm run start:phone 으로 다시 시작하세요.');
    process.exit(1);
  }

  const ngrok = await fetchNgrokTunnel();
  const meta = {
    mode: classification.mode,
    shareable: classification.shareable,
    ngrokPublicUrl: ngrokPublicUrl ?? ngrok?.public_url ?? null,
  };

  await writeShareArtifacts(url, meta);

  const manifest = writeExpoConnectManifest(projectRoot, {
    url,
    mode: meta.mode,
    shareable: meta.shareable,
    ngrokPublicUrl: meta.ngrokPublicUrl,
  });

  console.log(`접속 URL: ${url}`);
  console.log(`manifest: v${manifest.version} (${manifest.updatedAt})`);

  if (allPlatforms?.android?.url && allPlatforms.android.url !== url) {
    console.log(`Android: ${allPlatforms.android.url}`);
  }

  if (meta.ngrokPublicUrl) {
    console.log(`Ngrok: ${meta.ngrokPublicUrl}`);
  }

  console.log('\n저장된 공유 파일:');
  console.log(`  ${shareTxtPath}`);
  console.log(`  ${shareHtmlPath}`);
  console.log(`  ${qrPngPath}`);

  if (!classification.shareable) {
    console.log('\n⚠️  이 URL은 휴대폰에서 접속되지 않을 수 있습니다.');
    console.log('PC에서 Metro를 반드시 터널로 시작하세요:');
    console.log('  npm run start:phone');
    console.log('터널이 뜬 뒤 다시: npm run share\n');

    if (classification.mode === 'private' || classification.mode === 'localhost') {
      process.exit(2);
    }
  }

  console.log('\n✅ 공유 준비 완료');
  console.log('  · 카톡/메일: expo-go-share.txt 내용 복사');
  console.log('  · 브라우저: expo-go-share.html 열기 → 주소 복사 또는 QR 스캔');
  console.log('  · Expo Go: QR 스캔 (expo-go-qr.png)\n');
  process.exit(0);
}

main();
