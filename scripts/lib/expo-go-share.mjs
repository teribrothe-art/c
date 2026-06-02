/**
 * Expo Go 공유 URL 조회 (Metro + 터널)
 */
import { pickLanHost } from './pick-lan-host.mjs';

const DEFAULT_PORT = Number(process.env.PORT || 8081);
const DEFAULT_HOST = process.env.HOST || '127.0.0.1';

export async function waitForMetro({
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
  timeoutMs = 120_000,
  intervalMs = 1500,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  const statusUrl = `http://${host}:${port}/status`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(statusUrl);
      const text = await response.text();

      if (response.ok && text.includes('packager-status:running')) {
        return true;
      }
    } catch {
      // Metro 아직 미기동
    }

    await sleep(intervalMs);
  }

  return false;
}

export async function fetchNgrokTunnel() {
  try {
    const response = await fetch('http://127.0.0.1:4040/api/tunnels');
    const data = await response.json();
    const tunnels = data.tunnels ?? [];

    return tunnels.find((tunnel) => tunnel.proto === 'https') ?? tunnels[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchExpoOpenPayload({
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
} = {}) {
  const response = await fetch(`http://${host}:${port}/_expo/open`);

  if (!response.ok) {
    throw new Error(`Metro HTTP ${response.status} at :${port}/_expo/open`);
  }

  return response.json();
}

/** ngrok https:// URL → Expo Go exp:// URL */
export function publicUrlToExpUrl(publicUrl) {
  const parsed = new URL(publicUrl);
  let port = parsed.port;

  if (!port) {
    port = parsed.protocol === 'https:' ? '443' : '80';
  }

  return `exp://${parsed.hostname}:${port}`;
}

export function classifyExpoUrl(url, hasNgrokTunnel) {
  if (!url || !url.startsWith('exp://')) {
    return { mode: 'invalid', shareable: false };
  }

  if (url.includes('127.0.0.1') || url.includes('localhost')) {
    return { mode: 'localhost', shareable: false };
  }

  if (/\.exp\.direct|\.ngrok|u\.expo\.dev/i.test(url) || hasNgrokTunnel) {
    return { mode: 'tunnel', shareable: true };
  }

  if (/^exp:\/\/192\.168\./.test(url)) {
    return { mode: 'lan', shareable: true };
  }

  if (/^exp:\/\/(172\.|10\.)/.test(url)) {
    return { mode: 'private', shareable: false };
  }

  return { mode: 'unknown', shareable: true };
}

function shouldPreferNgrokUrl(metroUrl, hasNgrok) {
  if (!hasNgrok) {
    return false;
  }

  if (!metroUrl) {
    return true;
  }

  const classification = classifyExpoUrl(metroUrl, false);

  return (
    !classification.shareable ||
    classification.mode === 'private' ||
    classification.mode === 'localhost' ||
    classification.mode === 'invalid'
  );
}

export async function resolveExpoGoShareUrl(platform = process.env.PLATFORM || 'ios') {
  const payload = await fetchExpoOpenPayload();
  const ngrok = await fetchNgrokTunnel();
  const hasNgrok = Boolean(ngrok?.public_url);
  let url = payload.platforms?.[platform]?.url ?? payload.url ?? null;

  if (hasNgrok && shouldPreferNgrokUrl(url, hasNgrok)) {
    url = publicUrlToExpUrl(ngrok.public_url);
  }

  const classification = classifyExpoUrl(url, hasNgrok);

  return {
    url,
    platform,
    classification,
    ngrokPublicUrl: ngrok?.public_url ?? null,
    allPlatforms: payload.platforms ?? {},
    lanHost: pickLanHost(),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
