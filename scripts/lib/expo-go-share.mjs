/**
 * Expo Go 공유 URL 조회 (Metro + 터널)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pickLanHost } from './pick-lan-host.mjs';
import { fetchActiveTunnel } from './tunnel-provider.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const DEFAULT_PORT = Number(process.env.PORT || 8081);
const DEFAULT_HOST = process.env.HOST || '127.0.0.1';

const TUNNEL_HOST_RE =
  /\.exp\.direct|\.ngrok|trycloudflare\.com|loca\.lt|u\.expo\.dev/i;

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

/** @deprecated use fetchActiveTunnel */
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

/** 공개 HTTPS 터널 URL → Expo Go exp:// URL */
export function publicUrlToExpUrl(publicUrl) {
  const parsed = new URL(publicUrl);
  let port = parsed.port;

  if (!port) {
    port = parsed.protocol === 'https:' ? '443' : '80';
  }

  return `exp://${parsed.hostname}:${port}`;
}

export function classifyExpoUrl(url, hasPublicTunnel) {
  if (!url || !url.startsWith('exp://')) {
    return { mode: 'invalid', shareable: false };
  }

  if (url.includes('127.0.0.1') || url.includes('localhost')) {
    return { mode: 'localhost', shareable: false };
  }

  if (TUNNEL_HOST_RE.test(url) || hasPublicTunnel) {
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

export async function resolveExpoGoShareUrl(platform = process.env.PLATFORM || 'ios') {
  const payload = await fetchExpoOpenPayload();
  const tunnel = await fetchActiveTunnel(projectRoot);
  const hasPublicTunnel = Boolean(tunnel?.publicUrl);
  let url = payload.platforms?.[platform]?.url ?? payload.url ?? null;

  if (hasPublicTunnel) {
    url = publicUrlToExpUrl(tunnel.publicUrl);
  }

  const classification = classifyExpoUrl(url, hasPublicTunnel);

  return {
    url,
    platform,
    classification,
    ngrokPublicUrl: tunnel?.publicUrl ?? null,
    tunnelProvider: tunnel?.provider ?? null,
    allPlatforms: payload.platforms ?? {},
    lanHost: pickLanHost(),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
