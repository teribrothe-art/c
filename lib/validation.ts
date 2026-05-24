export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export const MAX_TREATMENT_NOTE_LENGTH = 500;

export const MIN_TREATMENT_NOTE_LENGTH = 5;

export function validateEmail(email: string) {
  const trimmed = email.trim();

  if (!trimmed) {
    return '이메일을 입력해주세요.';
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return '올바른 이메일 형식이 아닙니다.';
  }

  return null;
}

export function validatePassword(password: string) {
  if (!password) {
    return '비밀번호를 입력해주세요.';
  }

  if (password.length < 6) {
    return '비밀번호는 6자 이상이어야 합니다.';
  }

  if (!PASSWORD_REGEX.test(password)) {
    return '비밀번호는 영문과 숫자를 포함해야 합니다.';
  }

  return null;
}

export function validatePasswordConfirm(password: string, passwordConfirm: string) {
  if (!passwordConfirm) {
    return '비밀번호 확인을 입력해주세요.';
  }

  if (password !== passwordConfirm) {
    return '비밀번호가 일치하지 않습니다.';
  }

  return null;
}

export function validateTreatmentNote(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '내용을 입력해주세요.';
  }

  if (trimmed.length < MIN_TREATMENT_NOTE_LENGTH) {
    return `최소 ${MIN_TREATMENT_NOTE_LENGTH}자 이상 입력해주세요.`;
  }

  if (trimmed.length > MAX_TREATMENT_NOTE_LENGTH) {
    return `최대 ${MAX_TREATMENT_NOTE_LENGTH}자까지 입력할 수 있습니다.`;
  }

  return null;
}
