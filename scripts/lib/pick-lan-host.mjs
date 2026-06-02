/**
 * Expo Go LAN 접속용 PC IP 선택
 * Docker/WSL(172.x)·VM(10.x/172.x) 대신 실제 Wi‑Fi(192.168.x.x) 우선
 */
import os from 'node:os';

function isDockerOrVm172(address) {
  const parts = address.split('.').map(Number);
  return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

function isLinkLocal(address) {
  return address.startsWith('169.254.');
}

function isAndroidEmulator(address) {
  return address.startsWith('10.0.2.');
}

/** @returns {{ address: string, iface: string, kind: 'wifi' | 'lan' | 'other' } | null} */
export function pickLanHost() {
  const interfaces = os.networkInterfaces();
  /** @type {{ address: string, iface: string, score: number }[]} */
  const candidates = [];

  for (const [iface, addrs] of Object.entries(interfaces)) {
    for (const entry of addrs ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) {
        continue;
      }

      const { address } = entry;

      if (isLinkLocal(address) || isAndroidEmulator(address)) {
        continue;
      }

      let score = 0;

      if (address.startsWith('192.168.')) {
        score = 100;
      } else if (address.startsWith('10.')) {
        score = 50;
      } else if (isDockerOrVm172(address)) {
        score = 10;
      } else {
        score = 30;
      }

      const lower = iface.toLowerCase();
      if (/wi-?fi|wlan|wireless|en0|eth0/i.test(lower)) {
        score += 5;
      }

      candidates.push({ address, iface, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];

  if (!best) {
    return null;
  }

  const kind =
    best.address.startsWith('192.168.') ? 'wifi' : best.score >= 50 ? 'lan' : 'other';

  return { address: best.address, iface: best.iface, kind };
}

export function formatLanHostHint(host) {
  if (!host) {
    return 'LAN IP를 찾지 못했습니다. REACT_NATIVE_PACKAGER_HOSTNAME을 수동 설정하세요.';
  }

  if (host.kind === 'wifi') {
    return `Wi‑Fi IP: ${host.address} (${host.iface})`;
  }

  if (isDockerOrVm172(host.address)) {
    return `VM/Docker IP: ${host.address} — 폰 접속 불가할 수 있음. ngrok 터널(start:connect) 권장`;
  }

  return `LAN IP: ${host.address} (${host.iface})`;
}
