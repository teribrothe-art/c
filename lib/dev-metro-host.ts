import Constants from 'expo-constants';

/** Expo Go / dev client가 번들을 받은 Metro 호스트 (예: 192.168.0.5:8081) */
export function resolveMetroHostUri(): string | null {
  try {
    const fromConfig = Constants.expoConfig?.hostUri?.trim();
    if (fromConfig) {
      return fromConfig;
    }

    return Constants.expoGoConfig?.hostUri?.trim() || null;
  } catch {
    return null;
  }
}

export function metroStatusUrl(hostUri: string): string {
  const base = hostUri.startsWith('http') ? hostUri : `http://${hostUri}`;
  return `${base.replace(/\/$/, '')}/status`;
}

/** 터널 없이 LAN·VM 사설 IP만 쓰면 외부 휴대폰에서 접속 불가 */
export function isLikelyUnreachableFromPhone(hostUri: string): boolean {
  const host = hostUri.replace(/^https?:\/\//, '').split(':')[0] ?? hostUri;

  if (host === 'localhost' || host === '127.0.0.1') {
    return true;
  }

  if (/\.exp\.direct|\.ngrok|u\.expo\.dev/i.test(hostUri)) {
    return false;
  }

  if (/^192\.168\./.test(host)) {
    return false;
  }

  if (/^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return true;
  }

  return false;
}

export async function isMetroRunning(hostUri: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(metroStatusUrl(hostUri), { signal: controller.signal });
    const body = await response.text();
    return response.ok && body.includes('running');
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
