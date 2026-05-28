const NAS_HOST_HINTS = [
  'synology',
  'quickconnect',
  'diskstation',
  'myds.me',
  'nashome',
  'xnas.',
  '.local',
  '.lan',
  '.internal',
];

/** NAS·사설망·로컬 호스트 — 앱에서 백엔드로 쓰지 않음 */
export function isPrivateOrNasEndpoint(urlString: string): boolean {
  const trimmed = urlString.trim();

  if (!trimmed) {
    return true;
  }

  if (/^(smb|file|ftp):\/\//i.test(trimmed)) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) {
      return true;
    }

    if (NAS_HOST_HINTS.some((hint) => host.includes(hint))) {
      return true;
    }

    if (/^192\.168\./.test(host)) {
      return true;
    }

    if (/^10\./.test(host)) {
      return true;
    }

    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
      return true;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

export function warnIgnoredEndpoint(envKey: string, url: string) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      `[${envKey}] NAS/사설망 주소는 사용하지 않습니다. 공개 API URL(EXPO_PUBLIC_API_BASE_URL)을 설정하세요.`,
      url,
    );
  }
}
