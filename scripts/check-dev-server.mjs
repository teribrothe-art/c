#!/usr/bin/env node
/**
 * localhost:8081 개발 서버 상태 빠른 점검
 * 사용: node scripts/check-dev-server.mjs
 */
const port = Number(process.env.PORT || 8081);
const host = process.env.HOST || '127.0.0.1';
const url = `http://${host}:${port}/`;

async function main() {
  console.log(`Checking ${url} ...\n`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const text = await response.text();
    console.log(`HTTP ${response.status} ${response.statusText}`);
    console.log(`Body length: ${text.length} bytes`);

    if (response.ok && text.includes('<!DOCTYPE html')) {
      console.log('\nOK: Expo web dev server is responding.');
      process.exit(0);
    }

    console.log('\nWARN: Connected but response does not look like Expo web HTML.');
    process.exit(1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('abort') || message.includes('timeout')) {
      console.log('FAIL: Timeout — Metro may still be bundling. Wait 30–60s and retry.');
    } else if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      console.log('FAIL: Nothing is listening on this port.');
      console.log('Start the server: npm run web  (or: npx expo start --web --clear)');
    } else {
      console.log(`FAIL: ${message}`);
    }

    console.log('\nBrowser ERR_EMPTY_RESPONSE (-324) usually means:');
    console.log('  1) Expo was not running when you opened the tab');
    console.log('  2) Metro crashed during the first bundle (check terminal for red errors)');
    console.log('  3) You opened the URL before "Metro waiting on" appeared');
    process.exit(1);
  }
}

main();
