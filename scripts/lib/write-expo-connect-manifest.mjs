/**
 * expo-connect-manifest.json — app.json 버전과 QR 접속 URL 동기화
 */
import fs from 'node:fs';
import path from 'node:path';

const MANIFEST_FILENAME = 'expo-connect-manifest.json';

export function getManifestPath(projectRoot) {
  return path.join(projectRoot, MANIFEST_FILENAME);
}

export function readAppVersionMeta(projectRoot) {
  const appJsonPath = path.join(projectRoot, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  return {
    version: appJson.expo.version,
    buildLabel: appJson.expo.extra?.buildLabel?.trim() || null,
  };
}

export function readExpoConnectManifest(projectRoot) {
  const manifestPath = getManifestPath(projectRoot);

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

export function writeExpoConnectManifest(projectRoot, { url, mode, shareable = null, ngrokPublicUrl = null }) {
  const { version, buildLabel } = readAppVersionMeta(projectRoot);
  const manifest = {
    version,
    buildLabel,
    url: url?.trim() || null,
    updatedAt: new Date().toISOString(),
    mode: mode ?? null,
    shareable,
    ngrokPublicUrl,
  };

  fs.writeFileSync(getManifestPath(projectRoot), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return manifest;
}

/** app.json 버전이 바뀌면 이전 QR URL을 자동 무효화 */
export function invalidateConnectManifestIfVersionChanged(projectRoot) {
  const { version, buildLabel } = readAppVersionMeta(projectRoot);
  const existing = readExpoConnectManifest(projectRoot);

  if (!existing) {
    writeExpoConnectManifest(projectRoot, { url: null, mode: null });
    return { changed: true, previousVersion: null };
  }

  if (existing.version === version) {
    return { changed: false, previousVersion: null };
  }

  const manifest = {
    version,
    buildLabel,
    url: null,
    updatedAt: new Date().toISOString(),
    mode: null,
    shareable: null,
    ngrokPublicUrl: null,
    previousVersion: existing.version ?? null,
  };

  fs.writeFileSync(getManifestPath(projectRoot), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return { changed: true, previousVersion: existing.version ?? null };
}
