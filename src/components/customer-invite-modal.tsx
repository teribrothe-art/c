import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { showErrorAlert, showSuccessAlert } from '../../lib/alerts';
import {
  buildInviteDeepLink,
  buildInviteQrPayload,
  createCustomerInvitation,
  CustomerInvitation,
  getPendingInvitationForTreatment,
} from '../../lib/customer-invitations';
import { getErrorMessage } from '../../lib/errors';
import { formatPhoneInput } from '../../lib/phone-input';
import { colors } from '../../lib/theme';

type CustomerInviteModalProps = {
  visible: boolean;
  treatmentId: string;
  defaultCustomerName?: string;
  onClose: () => void;
  onInvitationCreated?: (invitation: CustomerInvitation) => void;
};

export function CustomerInviteModal({
  visible,
  treatmentId,
  defaultCustomerName = '',
  onClose,
  onInvitationCreated,
}: CustomerInviteModalProps) {
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerPhone, setCustomerPhone] = useState('');
  const [invitation, setInvitation] = useState<CustomerInvitation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setCustomerName((current) => current || defaultCustomerName);

    let isMounted = true;

    setIsLoadingInvite(true);

    getPendingInvitationForTreatment(treatmentId)
      .then((pending) => {
        if (!isMounted) {
          return;
        }

        if (pending) {
          setInvitation(pending);
          setCustomerName(pending.customer_name ?? defaultCustomerName);
          setCustomerPhone(pending.customer_phone ?? '');
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setIsLoadingInvite(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible, treatmentId, defaultCustomerName]);

  const handleClose = () => {
    setInvitation(null);
    setCustomerName(defaultCustomerName);
    setCustomerPhone('');
    onClose();
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const created = await createCustomerInvitation({
        treatmentId,
        customerName,
        customerPhone,
      });
      setInvitation(created);
      onInvitationCreated?.(created);
      showSuccessAlert('초대 코드가 생성됐어요. 고객에게 QR 또는 코드를 공유해주세요.');
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '초대 코드를 만들지 못했습니다.'));
    } finally {
      setIsCreating(false);
    }
  };

  const shareMessage = invitation
    ? `헤어 다이어리 초대\n코드: ${invitation.invite_code}\n\n1) 앱 설치 후 회원가입(고객)\n2) 초대 코드 입력 또는 QR 스캔\n\n${buildInviteDeepLink(invitation.invite_code)}`
    : '';

  const handleShare = async () => {
    if (!invitation) {
      return;
    }

    try {
      await Share.share({ message: shareMessage });
    } catch {
      showErrorAlert('공유에 실패했습니다.');
    }
  };

  const handleCopy = async () => {
    if (!invitation) {
      return;
    }

    await Clipboard.setStringAsync(invitation.invite_code);
    showSuccessAlert('초대 코드가 복사되었어요.');
  };

  const handleCopyLink = async () => {
    if (!invitation) {
      return;
    }

    await Clipboard.setStringAsync(buildInviteDeepLink(invitation.invite_code));
    showSuccessAlert('초대 링크가 복사되었어요.');
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {isLoadingInvite ? (
            <Text style={styles.loadingText}>초대 정보 불러오는 중...</Text>
          ) : !invitation ? (
            <>
              <Text style={styles.title}>고객을 초대하세요</Text>
              <Text style={styles.subtitle}>
                고객님이 헤어 다이어리에 가입하면{'\n'}자동으로 이 시술 기록이 연결돼요
              </Text>

              <Text style={styles.label}>고객 이름 *</Text>
              <TextInput
                placeholder="예: 김지원"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
              />

              <Text style={styles.label}>전화번호 (선택)</Text>
              <TextInput
                keyboardType="phone-pad"
                placeholder="010-0000-0000"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={customerPhone}
                onChangeText={(text) => setCustomerPhone(formatPhoneInput(text))}
                maxLength={13}
              />

              <Pressable
                disabled={isCreating}
                onPress={() => void handleCreate()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  isCreating && styles.buttonDisabled,
                ]}>
                <Text style={styles.primaryButtonText}>
                  {isCreating ? '생성 중...' : '초대 코드 생성'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>초대 코드</Text>
              <Text style={styles.code}>{invitation.invite_code}</Text>

              <View style={styles.qrWrap}>
                <QRCode size={200} value={buildInviteQrPayload(invitation.invite_code)} />
              </View>

              <Text style={styles.expiry}>7일 후 만료 · 가입 시 코드 입력 또는 QR 스캔</Text>
              <Text style={styles.steps}>
                고객: 회원가입 → &quot;초대 코드 있어요?&quot; → 코드 입력 또는 QR 스캔
              </Text>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => void handleShare()}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryButtonText}>공유</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleCopy()}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryButtonText}>코드 복사</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => void handleCopyLink()}
                style={({ pressed }) => [styles.linkCopyButton, pressed && styles.buttonPressed]}>
                <Text style={styles.linkCopyText}>앱 링크 복사 (설치 후 자동 열기)</Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={handleClose} style={styles.closeLink}>
            <Text style={styles.closeLinkText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 14,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  code: {
    color: colors.coral,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  qrWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  expiry: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  steps: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.lightCoral,
    borderRadius: 12,
    flex: 1,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: '800',
  },
  linkCopyButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkCopyText: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '700',
  },
  closeLink: {
    alignItems: 'center',
    paddingTop: 4,
  },
  closeLinkText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
