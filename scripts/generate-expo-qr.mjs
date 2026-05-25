#!/usr/bin/env node
/**
 * Expo Go 접속용 QR 코드 생성 (Metro 실행 중일 때)
 *
 * 사용:
 *   npm run start:phone    # 또는 start:lan — 별도 터미널
 *   npm run qr             # 터미널 QR + PNG 저장
 *
 * 환경변수: PORT, HOST, PLATFORM=ios|android, OUT=expo-go-qr.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const port = Number(process.env.PORT || 8081);
const host = process.env.HOST || '127.0.0.1';
const platform = process.env.PLATFORM || 'ios';
const outFile = process.env.OUT || path.join(projectRoot, 'expo-go-qr.png');
const saveHtml = process.argv.includes('--html');
const htmlPath = path.join(projectRoot, 'expo-go-qr.html');

async function fetchExpoGoUrl() {
  const openUrl = `http://${host}:${port}/_expo/open`;
  const response = await fetch(openUrl);

  if (!response.ok) {
    throw new Error(`Metro responded HTTP ${response.status} at ${openUrl}`);
  }

  const data = await response.json();
  const fromPlatform = data.platforms?.[platform]?.url;
  const url = fromPlatform || data.url;

  if (!url || !url.startsWith('exp://')) {
    throw new Error(`No exp:// URL in Metro response: ${JSON.stringify(data).slice(0, 400)}`);
  }

  return { url, openUrl, allPlatforms: data.platforms };
}

async function main() {
  console.log('Expo Go 접속 QR 생성 중...\n');

  let url;
  let allPlatforms;

  try {
    const result = await fetchExpoGoUrl();
    url = result.url;
    allPlatforms = result.allPlatforms;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.log(`FAIL: ${message}\n`);
    console.log('먼저 Metro를 띄운 뒤 다시 실행하세요:');
    console.log('  npm run start:phone   # 터널 (폰·PC 네트워크 달라도 OK, 권장)');
    console.log('  npm run start:lan     # 같은 Wi‑Fi');
    console.log('');
    console.log('터널 QR이 필요하면 반드시 --tunnel 로 시작해야 합니다 (start:phone).');
    process.exit(1);
  }

  console.log(`접속 URL (${platform}): ${url}`);

  if (allPlatforms) {
    const others = Object.entries(allPlatforms)
      .filter(([key]) => key !== platform && allPlatforms[key]?.url)
      .map(([key, val]) => `  ${key}: ${val.url}`)
      .join('\n');
    if (others) {
      console.log(`기타:\n${others}`);
    }
  }

  console.log('\n아래 QR을 Expo Go 앱으로 스캔하세요 (일반 카메라 X).\n');

  const terminalQr = await QRCode.toString(url, {
    type: 'terminal',
    small: true,
    errorCorrectionLevel: 'M',
  });
  console.log(terminalQr);

  await QRCode.toFile(outFile, url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
  console.log(`PNG 저장: ${outFile}`);

  if (saveHtml) {
    const dataUrl = await QRCode.toDataURL(url, { width: 360, margin: 2 });
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>헤어 다이어리 — Expo Go QR</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #fafafc; margin: 0; padding: 24px; text-align: center; }
    h1 { font-size: 1.25rem; }
    img { max-width: 100%; height: auto; background: #fff; padding: 12px; border-radius: 12px; }
    code { display: block; margin: 16px auto; word-break: break-all; font-size: 0.85rem; }
    p { color: #555; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>Expo Go 접속 QR</h1>
  <p>Expo Go 앱 → Scan QR code</p>
  <img src="${dataUrl}" alt="Expo Go QR" width="360" height="360" />
  <code>${url}</code>
  <p>Metro: <code>npm run start:phone</code> 실행 중이어야 합니다.</p>
</body>
</html>
`;
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`HTML 저장: ${htmlPath}`);
  }

  if (url.includes('127.0.0.1') || url.includes('localhost')) {
    console.log('\nWARN: URL이 localhost입니다. 휴대폰에서는 접속되지 않습니다.');
    console.log('  → npm run start:phone 또는 start:lan 으로 Metro를 다시 시작하세요.');
  }

  if (url.match(/^exp:\/\/172\.|^exp:\/\/10\.|^exp:\/\/192\.168\./)) {
    console.log('\nTIP: 폰과 PC가 다른 Wi‑Fi면 연결이 안 될 수 있습니다 → npm run start:phone');
  }

  console.log(`\n생성 시각: ${new Date().toLocaleString()}`);
}

main();
