type ErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

function getErrorText(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as ErrorLike).message ?? '');
  }

  return '';
}

function isNetworkError(message: string, code?: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('internet') ||
    normalized.includes('timeout') ||
    code === 'ECONNABORTED'
  );
}

function isPermissionError(message: string, code?: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('permission') ||
    normalized.includes('not authorized') ||
    normalized.includes('unauthorized') ||
    normalized.includes('jwt') ||
    normalized.includes('row-level security') ||
    normalized.includes('rls') ||
    code === '42501' ||
    code === 'PGRST301'
  );
}

export function getErrorMessage(error: unknown, fallback = '잠시 후 다시 시도해주세요') {
  const message = getErrorText(error);
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as ErrorLike).code ?? '')
      : undefined;

  if (!message) {
    return fallback;
  }

  if (isNetworkError(message, code)) {
    return '인터넷 연결을 확인해주세요';
  }

  if (isPermissionError(message, code)) {
    return '권한이 없습니다';
  }

  return fallback;
}

export function toAppError(error: unknown, fallback?: string) {
  return new Error(getErrorMessage(error, fallback));
}
