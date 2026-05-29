/** BFF / API Gateway base URL (trailing slash 없음). 설정 시 REST 모드 사용 */
export function getApiBaseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!raw || raw === '여기에_입력') {
    return null;
  }

  return raw.replace(/\/+$/, '');
}

export function isRestApiMode(): boolean {
  return getApiBaseUrl() !== null;
}

export const API_VERSION = 'v1';

export function apiUrl(path: string) {
  const base = getApiBaseUrl();

  if (!base) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;

  return `${base}${normalized}`;
}
