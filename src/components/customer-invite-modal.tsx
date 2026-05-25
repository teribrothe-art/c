import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
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
  createCustomerInvitation,
  CustomerInvitation,
} from '../../lib/customer-invitations';
import { getErrorMessage } from '../../lib/errors';
import { formatPhoneInput } from '../../lib/phone-input';
import { colors } from '../../lib/theme';

type CustomerInviteModalProps = {
  visible: boolean;
  treatmentId: string;
  onClose: () => void;
};

export function CustomerInviteModal({ visible, treatmentId, onClose }: CustomerInviteModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [invitation, setInvitation] = useState<CustomerInvitation | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleClose = () => {
    setInvitation(null);
    setCustomerName('');
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
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '초대 코드를 만들지 못했습니다.'));
    } finally {
      setIsCreating(false);
    }
  };

  const shareMessage = invitation
    ? `헤어 다이어리 초대 코드: ${invitation.invite_code}\n가입 시 코드를 입력해주세요.\n${buildInviteDeepLink(invitation.invite_code)}`
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

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {!invitation ? (
            <>
              <Text style={styles.title}>고객을 초대하세요</Text>
              <Text style={styles.subtitle}>
                고객님이 헤어 다이어리에 가입하면{'\n'}자동으로 이 시술 기록이 나타나요
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
                <QRCode size={200} value={buildInviteDeepLink(invitation.invite_code)} />
              </View>

              <Text style={styles.expiry}>7일 후 만료됩니다</Text>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => void handleShare()}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryButtonText}>카톡으로 공유</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleCopy()}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryButtonText}>복사</Text>
                </Pressable>
              </View>
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
