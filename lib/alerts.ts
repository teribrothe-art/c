import { Alert, Platform } from 'react-native';

function showWebAlert(title: string, message: string) {
  if (typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
  }
}

function showWebConfirm(title: string, message: string) {
  if (typeof window !== 'undefined') {
    return window.confirm(message ? `${title}\n\n${message}` : title);
  }

  return false;
}

export function showErrorAlert(message: string, title = '오류') {
  if (Platform.OS === 'web') {
    showWebAlert(title, message);
    return;
  }

  Alert.alert(title, message);
}

export function showSettlementCompleteAlert(customerName: string, onConfirm?: () => void) {
  const message = `${customerName}님의 시술이 정산 요청되었습니다.\n영업일 기준 2-3일 내 입금됩니다.`;

  if (Platform.OS === 'web') {
    showWebAlert('정산 요청 완료', message);
    onConfirm?.();
    return;
  }

  Alert.alert('정산 요청 완료', message, [{ text: '확인', onPress: onConfirm }]);
}

export function showSuccessAlert(message: string, onConfirm?: () => void) {
  if (Platform.OS === 'web') {
    showWebAlert('완료', message);
    onConfirm?.();
    return;
  }

  Alert.alert('완료', message, [{ text: '확인', onPress: onConfirm }]);
}

export function showWarningAlert(message: string, title = '안내') {
  if (Platform.OS === 'web') {
    showWebAlert(title, message);
    return;
  }

  Alert.alert(title, message, [{ text: '확인' }]);
}

export function showConfirmAlert({
  title,
  message,
  confirmLabel,
  cancelLabel = '취소',
  destructive = false,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    const confirmed = showWebConfirm(
      title,
      `${message}\n\n[${destructive ? '주의' : '확인'}] ${confirmLabel} / [취소] ${cancelLabel}`,
    );

    if (confirmed) {
      onConfirm();
    }

    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

/** 시술 Before/After — 앨범 또는 카메라 선택 (웹은 앨범만) */
export function showTreatmentPhotoSourceAlert({
  title,
  message,
  onLibrary,
  onCamera,
}: {
  title: string;
  message: string;
  onLibrary: () => void;
  onCamera: () => void;
}) {
  if (Platform.OS === 'web') {
    onLibrary();
    return;
  }

  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: '앨범에서 선택', onPress: onLibrary },
    { text: '카메라로 촬영', onPress: onCamera },
  ]);
}

export function showLoginFailureAlert(message = '이메일 또는 비밀번호가 올바르지 않습니다') {
  if (Platform.OS === 'web') {
    showWebAlert('로그인 실패', message);
    return;
  }

  Alert.alert('로그인 실패', message);
}
