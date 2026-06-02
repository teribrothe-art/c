/**
 * Metro 터널 — ngrok v3 / cloudflared / localtunnel
 * cloudflared: 토큰 없이 동작 (기본 폴백)
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { fetchNgrokTunnel } from './expo-go-share.mjs';

const STATE_FILENAME = '.expo-tunnel-state.json';

export function getTunnelStatePath(projectRoot) {
  return path.join(projectRoot, STATE_FILENAME);
}

export function readTunnelState(projectRoot) {
  const statePath = getTunnelStatePath(projectRoot);

  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

export function writeTunnelState(projectRoot, { publicUrl, provider }) {
  const state = {
    publicUrl,
    provider,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(getTunnelStatePath(projectRoot), `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  return state;
}

export function clearTunnelState(projectRoot) {
  const statePath = getTunnelStatePath(projectRoot);

  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveNgrokBin() {
  const candidates = [process.env.NGROK_BIN, 'ngrok'].filter(Boolean);

  for (const candidate of candidates) {
    const check = spawnSync(candidate, ['http', '--help'], { encoding: 'utf8' });
    const help = `${check.stdout ?? ''}${check.stderr ?? ''}`;

    if (check.status === 0 && help.includes('--traffic-policy-file')) {
      return candidate;
    }
  }

  return null;
}

function hasNgrokAuth() {
  return Boolean(
    process.env.NGROK_AUTHTOKEN ||
      process.env.NGROK_AUTH_TOKEN ||
      fs.existsSync(path.join(process.env.HOME || process.env.USERPROFILE || '', '.config/ngrok/ngrok.yml')),
  );
}

function startNgrokSidecar({ ngrokBin, port, projectRoot, policyPath }) {
  const args = ['http', String(port), '--host-header=rewrite'];

  if (fs.existsSync(policyPath)) {
    args.push('--traffic-policy-file', policyPath);
  }

  if (process.env.NGROK_REGION) {
    args.push('--region', process.env.NGROK_REGION);
  }

  const env = { ...process.env };

  if (process.env.NGROK_AUTHTOKEN) {
    env.NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;
  }

  if (process.env.NGROK_AUTH_TOKEN && !env.NGROK_AUTHTOKEN) {
    env.NGROK_AUTHTOKEN = process.env.NGROK_AUTH_TOKEN;
  }

  const child = spawn(ngrokBin, args, {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    env,
  });

  child.unref();
  return child;
}

function startCloudflaredSidecar({ port, projectRoot }) {
  const child = spawn(
    'npx',
    ['--yes', 'cloudflared', 'tunnel', '--url', `http://127.0.0.1:${port}`],
    {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      shell: process.platform === 'win32',
    },
  );

  child.unref();
  return child;
}

function startLocaltunnelSidecar({ port, projectRoot }) {
  const child = spawn('npx', ['--yes', 'localtunnel', '--port', String(port)], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    shell: process.platform === 'win32',
  });

  child.unref();
  return child;
}

function parseTunnelUrlFromOutput(text) {
  const ngrok = text.match(/https:\/\/[a-z0-9-]+\.ngrok-free\.app/i);
  if (ngrok) return ngrok[0];

  const cloudflare = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (cloudflare) return cloudflare[0];

  const lt = text.match(/https:\/\/[^\s]+\.loca\.lt/i);
  if (lt) return lt[0];

  return null;
}

async function waitForNgrokApi(timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const tunnel = await fetchNgrokTunnel();

    if (tunnel?.public_url) {
      return tunnel.public_url;
    }

    await sleep(800);
  }

  return null;
}

async function waitForOutputUrl(child, timeoutMs = 35_000) {
  return new Promise((resolve) => {
    let output = '';
    let settled = false;

    const finish = (url) => {
      if (settled) return;
      settled = true;
      resolve(url);
    };

    const onData = (chunk) => {
      output += chunk.toString();
      const url = parseTunnelUrlFromOutput(output);

      if (url) {
        finish(url);
      }
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);

    child.on('exit', () => finish(parseTunnelUrlFromOutput(output)));

    setTimeout(() => finish(parseTunnelUrlFromOutput(output)), timeoutMs);
  });
}

/**
 * @returns {Promise<{ publicUrl: string, provider: string } | null>}
 */
export async function startTunnel({ projectRoot, port, policyPath, prefer = 'auto' }) {
  clearTunnelState(projectRoot);

  /** @type {{ name: string, try: () => Promise<{ publicUrl: string, provider: string } | null> }[]} */
  const providers = [];

  if (prefer === 'ngrok' || prefer === 'auto') {
    providers.push({
      name: 'ngrok',
      try: async () => {
        const ngrokBin = resolveNgrokBin();

        if (!ngrokBin || !hasNgrokAuth()) {
          return null;
        }

        console.log('ngrok v3 터널 시도…');
        const child = startNgrokSidecar({ ngrokBin, port, projectRoot, policyPath });
        const publicUrl = await waitForNgrokApi();

        if (!publicUrl) {
          try {
            child.kill();
          } catch {
            // ignore
          }

          return null;
        }

        return { publicUrl, provider: 'ngrok' };
      },
    });
  }

  if (prefer === 'cloudflared' || prefer === 'auto') {
    providers.push({
      name: 'cloudflared',
      try: async () => {
        console.log('cloudflared 터널 시도… (토큰 불필요)');
        const child = startCloudflaredSidecar({ port, projectRoot });
        const publicUrl = await waitForOutputUrl(child);

        if (!publicUrl) {
          try {
            child.kill();
          } catch {
            // ignore
          }

          return null;
        }

        return { publicUrl, provider: 'cloudflared' };
      },
    });
  }

  if (prefer === 'localtunnel' || prefer === 'auto') {
    providers.push({
      name: 'localtunnel',
      try: async () => {
        console.log('localtunnel 시도…');
        const child = startLocaltunnelSidecar({ port, projectRoot });
        const publicUrl = await waitForOutputUrl(child);

        if (!publicUrl) {
          try {
            child.kill();
          } catch {
            // ignore
          }

          return null;
        }

        return { publicUrl, provider: 'localtunnel' };
      },
    });
  }

  for (const provider of providers) {
    try {
      const result = await provider.try();

      if (result?.publicUrl) {
        writeTunnelState(projectRoot, result);
        console.log(`✅ ${result.provider} 터널: ${result.publicUrl}\n`);
        return result;
      }
    } catch (error) {
      console.log(`${provider.name} 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return null;
}

/** @returns {Promise<{ publicUrl: string, provider: string } | null>} */
export async function fetchActiveTunnel(projectRoot) {
  const ngrok = await fetchNgrokTunnel();

  if (ngrok?.public_url) {
    return { publicUrl: ngrok.public_url, provider: 'ngrok' };
  }

  const state = readTunnelState(projectRoot);

  if (state?.publicUrl) {
    return { publicUrl: state.publicUrl, provider: state.provider ?? 'saved' };
  }

  return null;
}
