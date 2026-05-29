#!/usr/bin/env node
/**
 * Expo Go 접속오류 빠른 안내 + 점검
 * 사용: npm run connect
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyExpoUrl, fetchNgrokTunnel, resolveExpoGoShareUrl } from './lib/expo-go-share.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function runCheckApp() {
  return new Promise((resolve) => {
    const child = spawn('node', [path.join(__dirname, 'check-app-connection.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

async function main() {
  console.log('=== Expo Go 접속오류 안내 ===\n');

  try {
    await import('@expo/ngrok');
  } catch {
    console.log('【원인】 @expo/ngrok 미설치 → npm run start:phone 터널 실패\n');
    console.log('  → 프로젝트 폴더에서: npm install');
    console.log('  → 다시: npm run start:phone\n');
    process.exit(1);
  }

  let url = null;
  let classification = { mode: 'unknown', shareable: false };

  try {
    const resolved = await resolveExpoGoShareUrl(process.env.PLATFORM || 'android');
    url = resolved.url;
    classification = resolved.classification;
    const ngrok = await fetchNgrokTunnel();

    console.log(`현재 Metro URL: ${url ?? '(없음 — Metro 미실행)'}`);
    console.log(`접속 모드: ${classification.mode}${ngrok ? ' (ngrok 감지)' : ''}\n`);
  } catch {
    console.log('Metro가 꺼져 있거나 아직 준비 중입니다.\n');
  }

  if (!url) {
    console.log('【접속오류 — Metro 없음】\n');
    console.log('터미널 1:  npm run start:phone');
    console.log('터미널 2:  npm run share');
    console.log('생성된 expo-go-qr.png 를 Expo Go로 스캔하세요.\n');
    process.exit(1);
  }

  if (classification.mode === 'localhost' || classification.mode === 'private') {
    console.log('【접속오류 — 휴대폰에서 이 주소에 닿을 수 없음】\n');
    console.log('지금 URL은 PC/VM 내부 IP입니다. 폰과 같은 Wi‑Fi가 아니면 반드시 터널을 켜세요.\n');
    console.log('  1) 실행 중인 expo start 종료 (Ctrl+C)');
    console.log('  2) npm run start:phone   ← --tunnel --clear');
    console.log('  3) npm run share         ← QR·exp:// 주소 생성');
    console.log('  4) Expo Go에서 새 QR 스캔 또는 Reload(↻)\n');
    console.log('Cursor 원격 개발 중이면: 이 PC가 아닌 **본인 컴퓨터**에서 clone 후 위 명령을 실행하세요.\n');
    process.exit(2);
  }

  if (classification.mode === 'lan') {
    console.log('【같은 Wi‑Fi 필요】\n');
    console.log('PC와 휴대폰이 같은 Wi‑Fi인지 확인하세요. 안 되면 npm run start:phone (터널)을 사용하세요.\n');
  }

  console.log('--- 번들·서버 점검 ---\n');
  const code = await runCheckApp();
  process.exit(code);
}

main();
