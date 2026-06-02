#!/usr/bin/env node
/**
 * app.json 버전 변경 시 expo-connect-manifest QR URL 자동 무효화
 * start:phone 전에 실행됩니다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { invalidateConnectManifestIfVersionChanged } from './lib/write-expo-connect-manifest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const result = invalidateConnectManifestIfVersionChanged(projectRoot);

if (result.changed && result.previousVersion) {
  console.log(
    `[connect] v${result.previousVersion} → 새 버전 QR은 npm run share 실행 후 반영됩니다.`,
  );
}
