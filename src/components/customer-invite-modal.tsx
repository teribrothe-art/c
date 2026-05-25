import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
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
import {
  linkRegisteredCustomerToTreatment,
  RegisteredCustomerOption,
  searchRegisteredCustomers,
} from '../../lib/registered-customers';
import { colors } from '../../lib/theme';
import type { Treatment } from '../../lib/treatments';

type InviteMode = 'existing' | 'new';

type CustomerInviteModalProps = {
  visible: boolean;
  treatmentId: string;
  defaultCustomerName?: string;
  onClose: () => void;
  onInvitationCreated?: (invitation: CustomerInvitation) => void;
  onCustomerLinked?: (treatment: Treatment) => void;
};

export function CustomerInviteModal({
  visible,
  treatmentId,
  defaultCustomerName = '',
  onClose,
  onInvitationCreated,
  onCustomerLinked,
}: CustomerInviteModalProps) {
  const [mode, setMode] = useState<InviteMode>('existing');
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerPhone, setCustomerPhone] = useState('');
  const [invitation, setInvitation] = useState<CustomerInvitation | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<RegisteredCustomerOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setCustomerName((current) => current || defaultCustomerName);
    setMode('existing');
    setSearchQuery(defaultCustomerName);
    setSelectedCustomerId(null);

    let isMounted = true;

    setIsLoadingInvite(true);

    getPendingInvitationForTreatment(treatmentId)
      .then((pending) => {
        if (!isMounted) {
          return;
        }

        if (pending) {
          setInvitation(pending);
          setMode('new');
          setCustomerName(pending.customer_name ?? defaultCustomerName);
          setCustomerPhone(pending.customer_phone ?? '');
        } else {
          setInvitation(null);
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

  useEffect(() => {
    if (!visible || mode !== 'existing' || invitation) {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(() => {
      setIsSearching(true);

      searchRegisteredCustomers(searchQuery)
        .then((items) => {
          if (isMounted) {
            setCustomers(items);
          }
        })
        .catch(() => {
          if (isMounted) {
            setCustomers([]);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsSearching(false);
          }
        });
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [visible, mode, searchQuery, invitation]);

  const handleClose = () => {
    setInvitation(null);
    setCustomerName(defaultCustomerName);
    setCustomerPhone('');
    setSearchQuery('');
    setCustomers([]);
    setSelectedCustomerId(null);
    setMode('existing');
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
      setMode('new');
      onInvitationCreated?.(created);
      showSuccessAlert('초대 코드가 생성됐어요. 고객에게 QR 또는 코드를 공유해주세요.');
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '초대 코드를 만들지 못했습니다.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedCustomerId) {
      showErrorAlert('연결할 고객을 선택해주세요.');
      return;
    }

    try {
      setIsLinking(true);
      const updated = await linkRegisteredCustomerToTreatment(treatmentId, selectedCustomerId);
      onCustomerLinked?.(updated);
      showSuccessAlert('가입 고객과 시술이 연결됐어요.');
      handleClose();
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '고객 연결에 실패했습니다.'));
    } finally {
      setIsLinking(false);
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

  const renderModeTabs = () => (
    <View style={styles.tabRow}>
      <Pressable
        onPress={() => setMode('existing')}
        style={[styles.tab, mode === 'existing' && styles.tabSelected]}>
        <Text style={[styles.tabText, mode === 'existing' && styles.tabTextSelected]}>
          가입 고객 불러오기
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setMode('new')}
        style={[styles.tab, mode === 'new' && styles.tabSelected]}>
        <Text style={[styles.tabText, mode === 'new' && styles.tabTextSelected]}>신규 초대</Text>
      </Pressable>
    </View>
  );

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {isLoadingInvite ? (
            <Text style={styles.loadingText}>불러오는 중...</Text>
          ) : (
            <>
              <Text style={styles.title}>고객 연결</Text>
              {!invitation ? renderModeTabs() : null}

              {invitation || mode === 'new' ? (
                invitation ? (
                  <>
                    <Text style={styles.subtitle}>신규 고객용 초대 코드</Text>
                    <Text style={styles.code}>{invitation.invite_code}</Text>

                    <View style={styles.qrWrap}>
                      <QRCode size={200} value={buildInviteQrPayload(invitation.invite_code)} />
                    </View>

                    <Text style={styles.expiry}>7일 후 만료 · 가입 시 코드 입력 또는 QR 스캔</Text>

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
                      <Text style={styles.linkCopyText}>앱 링크 복사</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.subtitle}>
                      아직 가입하지 않은 고객에게{'\n'}초대 코드·QR을 보내세요
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
                )
              ) : (
                <>
                  <Text style={styles.subtitle}>
                    앱에 가입한 고객을 검색해{'\n'}이 시술 기록에 바로 연결할 수 있어요
                  </Text>

                  <TextInput
                    placeholder="이름 또는 이메일 검색"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                  />

                  <View style={styles.listWrap}>
                    {isSearching ? (
                      <ActivityIndicator color={colors.coral} style={styles.listLoader} />
                    ) : customers.length === 0 ? (
                      <Text style={styles.emptyList}>
                        {searchQuery.trim()
                          ? '검색 결과가 없어요. 신규 초대 탭을 이용해주세요.'
                          : '검색어를 입력하거나 아래 목록에서 고객을 선택하세요.'}
                      </Text>
                    ) : (
                      <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                        {customers.map((item) => {
                          const selected = selectedCustomerId === item.id;

                          return (
                            <Pressable
                              key={item.id}
                              onPress={() => setSelectedCustomerId(item.id)}
                              style={[styles.customerRow, selected && styles.customerRowSelected]}>
                              <View style={styles.customerRowBody}>
                                <Text style={styles.customerName}>{item.name}</Text>
                                <Text style={styles.customerEmail}>{item.email}</Text>
                              </View>
                              {item.linked ? (
                                <Text style={styles.linkedBadge}>연결됨</Text>
                              ) : selected ? (
                                <Text style={styles.selectedMark}>✓</Text>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  <Pressable
                    disabled={isLinking || !selectedCustomerId}
                    onPress={() => void handleLinkExisting()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.linkButton,
                      pressed && styles.buttonPressed,
                      (isLinking || !selectedCustomerId) && styles.buttonDisabled,
                    ]}>
                    <Text style={styles.primaryButtonText}>
                      {isLinking ? '연결 중...' : '선택한 고객 연결'}
                    </Text>
                  </Pressable>
                </>
              )}
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
    maxHeight: '92%',
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
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10,
  },
  tabSelected: {
    backgroundColor: colors.lightCoral,
  },
  tabText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextSelected: {
    color: colors.coral,
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
  listWrap: {
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 220,
    minHeight: 120,
    overflow: 'hidden',
  },
  listLoader: {
    marginVertical: 24,
  },
  emptyList: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 20,
    textAlign: 'center',
  },
  customerRow: {
    alignItems: 'center',
    borderBottomColor: '#EFEFF4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  customerRowSelected: {
    backgroundColor: '#F0FBF9',
  },
  customerRowBody: {
    flex: 1,
    gap: 2,
  },
  customerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  customerEmail: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  linkedBadge: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '800',
  },
  selectedMark: {
    color: colors.mint,
    fontSize: 18,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 16,
  },
  linkButton: {
    backgroundColor: colors.mint,
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
