const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const NON_INVITE_URL_PREFIXES = ['http://', 'https://', 'exp://', 'exps://'];

export function isValidInviteCodeFormat(code: string) {
  return INVITE_CODE_PATTERN.test(code);
}

function looksLikeDevOrExpoUrl(payload: string) {
  const lower = payload.trim().toLowerCase();

  return (
    NON_INVITE_URL_PREFIXES.some((prefix) => lower.startsWith(prefix)) ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('exp.direct') ||
    lower.includes('/_expo/')
  );
}

/** 입력란용 — 허용 문자만 남기고 6자리까지 (미완성 입력 가능) */
export function formatInviteCodeInput(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-HJ-NP-Z2-9]/gi, '')
    .slice(0, 6);
}

export function normalizeInviteCode(raw: string) {
  return formatInviteCodeInput(raw);
}

/** 저장·QR·딥링크용 — 유효한 6자리만 반환, 아니면 빈 문자열 */
export function sanitizeInviteCode(raw: string) {
  const code = formatInviteCodeInput(raw);

  return isValidInviteCodeFormat(code) ? code : '';
}

export function buildInviteDeepLink(code: string) {
  return `hairdiaryapp://invite/${normalizeInviteCode(code)}`;
}

/** QR 스캔용 — 딥링크(권장) 또는 6자리 코드 */
export function buildInviteQrPayload(code: string) {
  const normalized = normalizeInviteCode(code);

  return normalized ? buildInviteDeepLink(normalized) : '';
}

function extractInviteCodeSegment(segment: string) {
  const cleaned = segment.split(/[?#]/)[0]?.replace(/[^A-HJ-NP-Z2-9]/gi, '') ?? '';

  return sanitizeInviteCode(cleaned);
}

export function parseInviteCodeFromQrPayload(payload: string) {
  const trimmed = payload.trim();

  if (!trimmed || looksLikeDevOrExpoUrl(trimmed)) {
    return '';
  }

  const compact = trimmed.replace(/\s+/g, '');

  const deepLinkMatch = compact.match(/hairdiaryapp:\/\/invite\/([A-HJ-NP-Z2-9]{6})/i);

  if (deepLinkMatch?.[1]) {
    return sanitizeInviteCode(deepLinkMatch[1]);
  }

  if (compact.includes('invite/')) {
    const part = compact.split(/invite\//i)[1] ?? '';
    const fromPath = extractInviteCodeSegment(part);

    if (fromPath) {
      return fromPath;
    }
  }

  try {
    if (trimmed.startsWith('hairdiaryapp://')) {
      const url = new URL(trimmed);
      const segment = url.pathname.replace(/^\//, '').split('/');

      if (segment[0] === 'invite' && segment[1]) {
        return extractInviteCodeSegment(segment[1]);
      }
    }
  } catch {
    // URL 파싱 실패 시 아래 패턴으로 재시도
  }

  const inlineMatch = compact.match(/(?:^|[^A-HJ-NP-Z2-9])([A-HJ-NP-Z2-9]{6})(?:[^A-HJ-NP-Z2-9]|$)/i);

  if (inlineMatch?.[1]) {
    return sanitizeInviteCode(inlineMatch[1]);
  }

  if (/^[A-HJ-NP-Z2-9]{6}$/i.test(compact)) {
    return sanitizeInviteCode(compact);
  }

  return '';
}
