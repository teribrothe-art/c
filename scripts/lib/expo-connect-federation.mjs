/**
 * Expo Go 다중 서버 연합 접속 — Metro·터널·LAN·ngrok·원격 호스트 탐색
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyExpoUrl, fetchExpoOpenPayload, fetchNgrokTunnel } from './expo-go-share.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const manifestPath = path.join(projectRoot, 'expo-connect-manifest.json');
const configPath = path.join(projectRoot, 'expo-connect.config.json');

const DEFAULT_PORT = Number(process.env.PORT || 8081);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function loadConnectConfig() {
  let fileConfig = {};

  try {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    // optional config file
  }

  const envHosts = parseEnvHosts(process.env.EXPO_CONNECT_HOSTS);
  const configHosts = fileConfig.federation?.hosts ?? [];
  const mergedHosts = mergeHostLists(configHosts, envHosts);

  return {
    metroPort: Number(process.env.PORT || fileConfig.metroPort || DEFAULT_PORT),
    strategies: (process.env.EXPO_CONNECT_STRATEGIES ?? fileConfig.strategies?.join(',') ?? 'expo-tunnel,ngrok-relay,lan,federation')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    relay: {
      ngrok: { enabled: true, port: DEFAULT_PORT, ...fileConfig.relay?.ngrok },
      expoTunnel: { enabled: true, ...fileConfig.relay?.expoTunnel },
    },
    federation: { hosts: mergedHosts },
  };
}

function parseEnvHosts(raw) {
  if (!raw?.trim()) {
    return [];
  }

  return raw.split(',').map((entry, index) => {
    const trimmed = entry.trim();
    const [host, portPart] = trimmed.includes(':') ? trimmed.split(':') : [trimmed, String(DEFAULT_PORT)];

    return {
      id: `env-${index}`,
      host: host.trim(),
      port: Number(portPart) || DEFAULT_PORT,
      label: `환경변수 ${host}`,
    };
  });
}

function mergeHostLists(configHosts, envHosts) {
  const seen = new Set();
  const merged = [];

  for (const host of [...configHosts, ...envHosts]) {
    const key = `${host.host}:${host.port ?? DEFAULT_PORT}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push({
      port: DEFAULT_PORT,
      ...host,
    });
  }

  if (merged.length === 0) {
    merged.push({ id: 'local', host: '127.0.0.1', port: DEFAULT_PORT, label: '로컬 Metro' });
  }

  return merged;
}

export function getLanIPv4() {
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  return null;
}

export async function probeMetroHost(host, port = DEFAULT_PORT, timeoutMs = 5000) {
  const statusUrl = `http://${host}:${port}/status`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(statusUrl, { signal: controller.signal });
    const text = await response.text();
    const running = response.ok && text.includes('running');

    if (!running) {
      return { host, port, running: false, expoUrl: null, mode: 'offline' };
    }

    const open = await fetchExpoOpenPayload({ host, port });
    const expoUrl = open.platforms?.android?.url ?? open.platforms?.ios?.url ?? open.url ?? null;
    const classification = classifyExpoUrl(expoUrl, false);

    return {
      host,
      port,
      running: true,
      expoUrl,
      mode: classification.mode,
      shareable: classification.shareable,
      source: 'metro',
    };
  } catch {
    return { host, port, running: false, expoUrl: null, mode: 'offline' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeAllFederationHosts(config = loadConnectConfig()) {
  const results = [];

  for (const entry of config.federation.hosts) {
    const host = entry.host === 'auto' ? getLanIPv4() : entry.host;

    if (!host) {
      continue;
    }

    const probed = await probeMetroHost(host, entry.port ?? config.metroPort);
    results.push({
      id: entry.id,
      label: entry.label ?? entry.id,
      ...probed,
    });
  }

  return results;
}

export async function probeNgrokRelayApi() {
  const tunnel = await fetchNgrokTunnel();

  if (!tunnel?.public_url) {
    return null;
  }

  const hostname = tunnel.public_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const expoUrl = `exp://${hostname}`;

  return {
    source: 'ngrok-api',
    publicUrl: tunnel.public_url,
    expoUrl,
    mode: 'tunnel',
    shareable: true,
    label: 'Ngrok 터널 (Expo 내장)',
  };
}

export async function startNgrokRelay(port = DEFAULT_PORT) {
  let ngrok;

  try {
    ngrok = await import('@expo/ngrok');
  } catch {
    return {
      ok: false,
      error: '@expo/ngrok 미설치 — npm install 실행',
    };
  }

  const connect = ngrok.default?.connect ?? ngrok.connect;

  if (typeof connect !== 'function') {
    return { ok: false, error: 'ngrok connect 함수를 찾을 수 없습니다.' };
  }

  try {
    const opts = { addr: port };

    if (process.env.NGROK_AUTHTOKEN?.trim()) {
      opts.authtoken = process.env.NGROK_AUTHTOKEN.trim();
    }

    const publicUrl = await connect(opts);
    const hostname = String(publicUrl).replace(/^https?:\/\//, '').replace(/\/$/, '');
    const expoUrl = `exp://${hostname}`;

    return {
      ok: true,
      source: 'ngrok-relay',
      publicUrl: String(publicUrl),
      expoUrl,
      mode: 'tunnel',
      shareable: true,
      label: 'Ngrok 릴레이 (연합)',
      disconnect: ngrok.default?.disconnect ?? ngrok.disconnect,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      error: message,
    };
  }
}

export function buildLanExpoUrl(lanIp, port = DEFAULT_PORT) {
  if (!lanIp) {
    return null;
  }

  const expoUrl = `exp://${lanIp}:${port}`;
  const classification = classifyExpoUrl(expoUrl, false);

  return {
    source: 'lan',
    expoUrl,
    mode: classification.mode,
    shareable: classification.shareable,
    label: `LAN (${lanIp})`,
    host: lanIp,
    port,
  };
}

export function scoreEndpoint(endpoint) {
  if (!endpoint?.expoUrl || !endpoint.shareable) {
    return -1;
  }

  const priority = {
    tunnel: 100,
    lan: 60,
    unknown: 40,
    private: 10,
    localhost: 0,
    offline: -1,
    invalid: -1,
  };

  let score = priority[endpoint.mode] ?? 30;

  if (endpoint.source === 'ngrok-relay') {
    score += 5;
  }

  if (endpoint.source === 'ngrok-api') {
    score += 3;
  }

  if (endpoint.source === 'metro' && endpoint.mode === 'tunnel') {
    score += 8;
  }

  return score;
}

export async function resolveBestExpoEndpoint(platform = process.env.PLATFORM || 'android') {
  const config = loadConnectConfig();
  const candidates = [];

  if (config.strategies.includes('expo-tunnel') || config.strategies.includes('federation')) {
    const local = await probeMetroHost('127.0.0.1', config.metroPort);

    if (local.running && local.expoUrl) {
      candidates.push({
        ...local,
        label: '로컬 Metro',
        source: 'metro',
      });
    }
  }

  if (config.strategies.includes('ngrok-relay')) {
    const ngrokApi = await probeNgrokRelayApi();

    if (ngrokApi) {
      candidates.push(ngrokApi);
    }
  }

  if (config.strategies.includes('lan')) {
    const lanIp = getLanIPv4();
    const lan = buildLanExpoUrl(lanIp, config.metroPort);
    const localRunning = candidates.some((c) => c.running);

    if (lan && localRunning) {
      candidates.push(lan);
    }
  }

  if (config.strategies.includes('federation')) {
    const remoteHosts = await probeAllFederationHosts(config);

    for (const remote of remoteHosts) {
      if (remote.running && remote.expoUrl && remote.host !== '127.0.0.1') {
        candidates.push({
          ...remote,
          source: 'federation',
        });
      }
    }
  }

  const ranked = candidates
    .map((endpoint) => ({ ...endpoint, score: scoreEndpoint(endpoint) }))
    .filter((endpoint) => endpoint.score >= 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0] ?? null;

  return {
    platform,
    best,
    candidates: ranked,
    config,
  };
}

export function writeConnectManifest(payload) {
  const manifest = {
    updatedAt: new Date().toISOString(),
    ...payload,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifestPath;
}

export function readConnectManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

export async function waitForLocalMetro(port = DEFAULT_PORT, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const probe = await probeMetroHost('127.0.0.1', port, 3000);

    if (probe.running) {
      return true;
    }

    await sleep(1500);
  }

  return false;
}
