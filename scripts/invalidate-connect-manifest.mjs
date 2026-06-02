#!/usr/bin/env node
/**
 * Metro(start:phone) 시작 전 — 만료된 터널 QR URL 제거
 * 터널 주소는 Metro+ngrok 실행 중에만 npm run share 로 갱신됩니다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  clearConnectManifestSessionUrls,
  invalidateConnectManifestIfVersionChanged,
} from './lib/write-expo-connect-manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const versionResult = invalidateConnectManifestIfVersionChanged(projectRoot);

if (versionResult.changed && versionResult.previousVersion) {
  console.log(
    `[connect] v${versionResult.previousVersion} → 새 버전 QR은 npm run share 실행 후 반영됩니다.`,
  );
}

const sessionResult = clearConnectManifestSessionUrls(projectRoot);

if (sessionResult.cleared) {
  console.log('[connect] 이전 터널 URL을 비웠습니다. Metro 기동 후 npm run share 를 실행하세요.');
}
