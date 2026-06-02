#!/usr/bin/env node
/**
 * ngrok v3 + Traffic Policy 로 Metro(또는 로컬 프록시) 터널
 *
 * 터미널 1: npm run start:wifi   (또는 expo start --localhost)
 * 터미널 2: npm run tunnel:policy
 * 터미널 3: npm run share        (4040 API에서 ngrok URL 읽음)
 *
 * 직접 실행:
 *   ngrok http 8081 --traffic-policy-file policy.yaml
 *   ngrok http 80 --traffic-policy-file policy.yaml
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const policyPath = path.join(projectRoot, 'policy.yaml');
const defaultPort = Number(process.env.NGROK_UPSTREAM_PORT || process.argv[2] || 8081);
const host = process.env.NGROK_UPSTREAM_HOST || '127.0.0.1';

function resolveNgrokBin() {
  const candidates = [
    process.env.NGROK_BIN,
    'ngrok',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate) ? candidate : candidate;
    const check = spawnSync(resolved, ['http', '--help'], { encoding: 'utf8' });
    const help = `${check.stdout ?? ''}${check.stderr ?? ''}`;

    if (check.status === 0 && help.includes('--traffic-policy-file')) {
      return resolved;
    }
  }

  return null;
}

async function waitForUpstream({ port, host, timeoutMs = 60_000, intervalMs = 1500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  const probe = `http://${host}:${port}/status`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(probe);
      const text = await response.text();

      if (response.ok && (text.includes('packager-status:running') || text.includes('running'))) {
        return true;
      }
    } catch {
      try {
        const response = await fetch(`http://${host}:${port}/`);
        if (response.ok || response.status === 404) {
          return true;
        }
      } catch {
        // upstream 아직 없음
      }
    }

    await sleep(intervalMs);
  }

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!fs.existsSync(policyPath)) {
    console.error(`FAIL: policy.yaml 없음 → ${policyPath}`);
    process.exit(1);
  }

  const ngrokBin = resolveNgrokBin();

  if (!ngrokBin) {
    console.log('FAIL: ngrok v3가 필요합니다 (--traffic-policy-file 지원).');
    console.log('');
    console.log('설치: https://ngrok.com/download');
    console.log('토큰: ngrok config add-authtoken YOUR_TOKEN');
    console.log('');
    console.log('참고: npm의 @expo/ngrok(v2)은 Traffic Policy를 지원하지 않습니다.');
    console.log('Expo 내장 터널만 쓰려면: npm run start:phone');
    process.exit(1);
  }

  console.log('=== ngrok Traffic Policy 터널 ===\n');
  console.log(`정책: ${policyPath}`);
  console.log(`업스트림: http://${host}:${defaultPort}`);
  console.log('');

  if (!process.env.NGROK_SKIP_UPSTREAM_WAIT) {
    console.log('업스트림 대기 중… (Metro: npm run start:wifi 또는 expo start)\n');
    const ready = await waitForUpstream({ port: defaultPort, host });

    if (!ready) {
      console.log(`WARN: ${host}:${defaultPort} 에서 응답 없음. Metro를 먼저 켠 뒤 ngrok만 재시작하세요.\n`);
    } else {
      console.log('업스트림 확인됨.\n');
    }
  }

  const args = ['http', String(defaultPort), '--traffic-policy-file', policyPath];

  if (process.env.NGROK_REGION) {
    args.push('--region', process.env.NGROK_REGION);
  }

  console.log(`실행: ${ngrokBin} ${args.join(' ')}\n`);
  console.log('터널 URL은 http://127.0.0.1:4040 또는 ngrok 출력에서 확인.');
  console.log('Expo 공유: 다른 터미널에서 npm run share\n');

  const child = spawn(ngrokBin, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
