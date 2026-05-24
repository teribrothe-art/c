import { Alert } from 'react-native';

export function showErrorAlert(message: string, title = '오류') {
  Alert.alert(title, message);
}

export function showSuccessAlert(message: string, onConfirm?: () => void) {
  Alert.alert('완료', message, [{ text: '확인', onPress: onConfirm }]);
}

export function showWarningAlert(message: string, title = '안내') {
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
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

export function showLoginFailureAlert() {
  Alert.alert('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다');
}
