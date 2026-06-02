#!/usr/bin/env node
/**
 * Android USB — ngrok 없이 Metro 연결 (adb reverse)
 *
 * 1) USB 디버깅 켜기 · PC에 연결
 * 2) npm run start          (또는 start:wifi)
 * 3) npm run android:usb
 * 4) Expo Go → exp://127.0.0.1:8081 (또는 QR)
 */
import { spawnSync } from 'node:child_process';

const port = Number(process.env.PORT || 8081);

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });

  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
}

function main() {
  console.log('=== Android USB (adb reverse) ===\n');

  const version = run('adb', ['version']);

  if (!version.ok) {
    console.log('FAIL: adb 를 찾을 수 없습니다.');
    console.log('  → Android SDK platform-tools 설치 후 PATH 추가');
    process.exit(1);
  }

  const devices = run('adb', ['devices']);
  const lines = devices.stdout.split('\n').filter((line) => line.includes('\tdevice'));

  if (lines.length === 0) {
    console.log('FAIL: USB 로 연결된 Android 기기가 없습니다.');
    console.log('  → 개발자 옵션 · USB 디버깅 활성화');
    process.exit(1);
  }

  const reverse = run('adb', ['reverse', `tcp:${port}`, `tcp:${port}`]);

  if (!reverse.ok) {
    console.log(`FAIL: adb reverse tcp:${port} tcp:${port}`);
    console.log(reverse.stderr || reverse.stdout);
    process.exit(1);
  }

  const url = `exp://127.0.0.1:${port}`;

  console.log(`OK: adb reverse tcp:${port} tcp:${port}`);
  console.log('');
  console.log('Expo Go → Enter URL manually:');
  console.log(`  ${url}`);
  console.log('');
  console.log('Metro: npm run start  (또는 npm run start:wifi)');
  console.log('QR: npm run qr');
}

main();
