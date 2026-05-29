#!/usr/bin/env node
/**
 * Expo Go 접속 오류 종합 점검
 * 사용: npm run check:app
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8081);
const host = process.env.HOST || '127.0.0.1';

function runNodeScript(name) {
  return new Promise((resolve) => {
    const child = spawn('node', [path.join(__dirname, name)], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', (code) => resolve(code === 0));
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  try {
    return { ok: response.ok, data: JSON.parse(text) };
  } catch {
    return { ok: response.ok, data: null, text };
  }
}

async function main() {
  console.log('=== Expo Go 접속 점검 (접속오류 시 npm run connect) ===\n');

  let statusOk = false;
  try {
    const status = await fetch(`http://${host}:${port}/status`);
    statusOk = status.ok && (await status.text()).includes('running');
    console.log(`Metro /status: ${statusOk ? 'OK (running)' : 'FAIL'}`);
  } catch {
    console.log('Metro /status: FAIL (서버 미실행)');
  }

  const open = await fetchJson(`http://${host}:${port}/_expo/open`);
  const expoUrl = open.data?.platforms?.ios?.url ?? open.data?.url ?? null;
  console.log(`Expo Go URL: ${expoUrl ?? '(없음)'}`);

  if (expoUrl?.includes('127.0.0.1') || expoUrl?.includes('localhost')) {
    console.log('  WARN: localhost URL — 휴대폰에서 접속 불가. start:lan 또는 start:phone 사용');
  }
  if (expoUrl?.match(/^exp:\/\/(172\.|10\.|192\.168\.)/)) {
    console.log('  WARN: 사설 IP — 폰과 PC가 같은 Wi‑Fi가 아니면 접속 불가. start:phone(터널) 권장');
  }

  let tunnelOk = false;
  try {
    const tunnels = await fetchJson('http://127.0.0.1:4040/api/tunnels');
    tunnelOk = Boolean(tunnels.data?.tunnels?.length);
    console.log(`Ngrok 터널: ${tunnelOk ? 'OK' : '없음 (npm run start:phone 필요)'}`);
  } catch {
    console.log('Ngrok 터널: 없음 (npm run start:phone 필요)');
  }

  console.log('\n--- 상세 점검 ---\n');

  const devOk = await runNodeScript('check-dev-server.mjs');
  console.log('');
  const phoneOk = await runNodeScript('check-phone-bundle.mjs');

  console.log('\n=== 요약 ===\n');

  if (!statusOk) {
    console.log('FAIL: Metro가 꺼져 있습니다.');
    console.log('  → npm run start:phone   (폰 접속, 터널)');
    console.log('  → npm run start:lan     (같은 Wi‑Fi)');
    process.exit(1);
  }

  if (!phoneOk) {
    console.log('FAIL: 앱 번들 오류. 터미널 빨간 Metro 로그 확인 후 npm run start:phone');
    process.exit(1);
  }

  if (!tunnelOk && expoUrl?.match(/^exp:\/\/(172\.|10\.)/)) {
    console.log('【접속오류】 서버·번들은 PC에서 정상이나, 이 URL은 휴대폰에서 열리지 않습니다.');
    console.log('  → 실행 중인 Metro 종료 후: npm run start:phone');
    console.log('  → npm run share 로 새 QR 생성 후 재스캔');
    console.log('  → Expo Go 최신(SDK 56), Reload(↻)');
    console.log('  → Cursor 원격 VM이면 본인 PC에서 clone 후 동일 명령 실행');
    process.exit(2);
  }

  console.log('OK: 이 환경에서 서버·웹·앱 번들 모두 정상입니다.');
  if (devOk) {
    console.log(`접속 주소: ${expoUrl}`);
    console.log('QR 생성: npm run qr');
  }
  process.exit(0);
}

main();
