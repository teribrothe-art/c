#!/usr/bin/env node
/**
 * Expo Go(휴대폰)용 Metro 번들 응답 점검
 * 사용: npm run check:phone  (Metro가 떠 있는 상태에서)
 */
const port = Number(process.env.PORT || 8081);
const host = process.env.HOST || '127.0.0.1';
const platform = process.env.PLATFORM || 'ios';
const url = `http://${host}:${port}/node_modules/expo-router/entry.bundle?platform=${platform}&dev=true&minify=false`;

async function main() {
  console.log(`Checking ${platform} bundle at ${url} ...\n`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const text = await response.text();

    if (!response.ok) {
      console.log(`FAIL: HTTP ${response.status}`);
      if (text.length < 4000) {
        console.log(text);
      } else {
        console.log(`${text.slice(0, 1200)}...`);
      }
      process.exit(1);
    }

    if (text.includes('UnableToResolveError') || text.includes('"type":"UnableToResolveError"')) {
      console.log('FAIL: Metro returned a resolution error (bundle is JSON error, not JS).');
      console.log(text.slice(0, 1500));
      process.exit(1);
    }

    if (text.length < 50_000 || !text.includes('__BUNDLE_START_TIME__')) {
      console.log(`FAIL: Response too small (${text.length} bytes) or not a valid bundle.`);
      process.exit(1);
    }

    console.log(`OK: ${platform} dev bundle ready (${(text.length / 1_000_000).toFixed(1)} MB).`);
    console.log('Expo Go can load the app if the phone reaches this Metro host (LAN or tunnel QR).');
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('abort') || message.includes('timeout')) {
      console.log('FAIL: Timeout — first bundle can take 1–2 minutes. Wait and retry.');
    } else if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      console.log('FAIL: Metro is not running on this port.');
      console.log('Start for phone: npm run start:phone  (tunnel) or npm run start:lan  (same Wi‑Fi)');
    } else {
      console.log(`FAIL: ${message}`);
    }

    console.log('\n휴대폰 접속이 안 될 때 흔한 원인:');
    console.log('  1) npm run web / web:clear 만 실행 (브라우저용) → start:phone 또는 start:lan 사용');
    console.log('  2) PC와 폰이 다른 Wi‑Fi → start:phone (터널)');
    console.log('  3) QR을 스캔했지만 Metro가 아직 번들 중 → 터미널 대기 후 Reload');
    console.log('  4) Expo Go 구버전 → 스토어에서 최신 (SDK 56)');
    process.exit(1);
  }
}

main();
