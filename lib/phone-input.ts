const MOBILE_PREFIXES = ['010', '011', '016', '017', '018', '019'];

/** 숫자만 추출 (최대 11자리) */
export function sanitizePhoneDigits(value: string) {
  return value.replace(/[^0-9]/g, '').slice(0, 11);
}

/**
 * 한국 전화번호 하이픈 자동 입력
 * - 휴대폰(010 등): 010-1234-5678
 * - 서울(02): 02-123-4567 / 02-1234-5678
 * - 기타 지역(031 등): 031-123-4567
 */
export function formatKoreanPhoneNumber(value: string) {
  const digits = sanitizePhoneDigits(value);

  if (!digits) {
    return '';
  }

  if (digits.startsWith('02')) {
    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 5) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }

    if (digits.length <= 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    }

    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  const mobilePrefix = MOBILE_PREFIXES.find((prefix) => digits.startsWith(prefix));

  if (mobilePrefix) {
    if (digits.length <= mobilePrefix.length) {
      return digits;
    }

    if (digits.length <= mobilePrefix.length + 4) {
      return `${digits.slice(0, mobilePrefix.length)}-${digits.slice(mobilePrefix.length)}`;
    }

    return `${digits.slice(0, mobilePrefix.length)}-${digits.slice(mobilePrefix.length, mobilePrefix.length + 4)}-${digits.slice(mobilePrefix.length + 4)}`;
  }

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export function formatPhoneInput(value: string) {
  return formatKoreanPhoneNumber(sanitizePhoneDigits(value));
}
