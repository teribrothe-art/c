import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showErrorAlert } from '../../lib/alerts';
import { getErrorMessage } from '../../lib/errors';
import { colors } from '../../lib/theme';
import {
  DEFAULT_TREATMENT_DURATION,
  defaultTreatmentTitle,
  DURATION_OPTIONS,
  TREATMENT_TYPE_OPTIONS,
  titlePresetsForType,
} from '../../lib/treatment-options';
import { parseWonAmount } from '../../lib/currency-input';
import { createDesignerTreatment } from '../../lib/treatments';
import {
  type RegisteredCustomerOption,
  searchRegisteredCustomers,
} from '../../lib/registered-customers';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import { DesignerScreenBackFooter } from '../../src/components/designer-screen-back-footer';
import { TAB_BAR_BOTTOM_INSET } from '../../src/components/role-bottom-tab-bar';
import { TreatmentOptionChips } from '../../src/components/treatment-option-chips';
import { WonAmountInput } from '../../src/components/won-amount-input';

export default function DesignerInputScreen() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [duration, setDuration] = useState(DEFAULT_TREATMENT_DURATION);
  const [treatmentTitle, setTreatmentTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<RegisteredCustomerOption[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  const openCreateModal = (type: string) => {
    setSelectedType(type);
    setDuration(DEFAULT_TREATMENT_DURATION);
    setTreatmentTitle(defaultTreatmentTitle(type));
    setPriceText('');
    setCustomerName('');
    setSelectedCustomerId(null);
    setCustomerSuggestions([]);
    setModalVisible(true);
  };

  useEffect(() => {
    if (!modalVisible) {
      return;
    }

    const query = customerName.trim();
    let isMounted = true;
    const timer = setTimeout(() => {
      setIsSearchingCustomers(true);

      searchRegisteredCustomers(query)
        .then((items) => {
          if (isMounted) {
            setCustomerSuggestions(items);
          }
        })
        .catch(() => {
          if (isMounted) {
            setCustomerSuggestions([]);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsSearchingCustomers(false);
          }
        });
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [modalVisible, customerName]);

  const handleSelectCustomerSuggestion = useCallback((item: RegisteredCustomerOption) => {
    setCustomerName(item.name);
    setSelectedCustomerId(item.id);
  }, []);

  const handleCreate = async () => {
    const price = parseWonAmount(priceText);

    if (!customerName.trim()) {
      showErrorAlert('고객 이름을 입력해주세요.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      showErrorAlert('시술 금액을 올바르게 입력해주세요.');
      return;
    }

    try {
      setIsCreating(true);
      const treatment = await createDesignerTreatment({
        customerName,
        customerId: selectedCustomerId,
        treatmentType: selectedType,
        treatmentTitle: treatmentTitle.trim() || defaultTreatmentTitle(selectedType),
        duration,
        price,
      });

      setModalVisible(false);
      setCustomerName('');
      setSelectedCustomerId(null);
      router.push(`/designer/treatment/${treatment.id}`);
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '시술을 만들지 못했습니다.'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_BOTTOM_INSET + 48,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>시술</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>어떤 시술을 추가할까요?</Text>
          <Text style={styles.heroSubtitle}>
            시술 종류를 선택하면 고객 이름을 입력해 기록을 만듭니다.
          </Text>
        </View>

        <View style={styles.typeGrid}>
          {TREATMENT_TYPE_OPTIONS.map((item) => (
            <View key={item.label} style={styles.typeTileWrap}>
              <Pressable
                disabled={isCreating}
                onPress={() => openCreateModal(item.label)}
                style={({ pressed }) => [styles.typeTile, pressed && styles.typeTilePressed]}>
                <Text style={styles.quickIcon}>{item.icon}</Text>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={styles.footerHint}>
          고객 명단은 고객 탭에서 확인하세요. 시술 추가 후 상세에서 입력·초대·결제 요청을 진행하세요.
        </Text>
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedType} 시술 추가</Text>

            <Text style={styles.label}>고객 이름 *</Text>
            <TextInput
              placeholder="예: 김지원"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={customerName}
              onChangeText={(text) => {
                setCustomerName(text);
                setSelectedCustomerId(null);
              }}
            />

            {isSearchingCustomers ? (
              <ActivityIndicator color={colors.coral} size="small" style={styles.customerSearchSpinner} />
            ) : null}

            {customerSuggestions.length > 0 ? (
              <View style={styles.suggestionBlock}>
                <Text style={styles.suggestionLabel}>가입 고객 (이름 일치 시 자동 연결)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.suggestionRow}>
                    {customerSuggestions.slice(0, 8).map((item) => {
                      const selected = selectedCustomerId === item.id;

                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => handleSelectCustomerSuggestion(item)}
                          style={({ pressed }) => [
                            styles.suggestionChip,
                            selected && styles.suggestionChipSelected,
                            pressed && { opacity: 0.9 },
                          ]}>
                          <Text
                            style={[
                              styles.suggestionChipText,
                              selected && styles.suggestionChipTextSelected,
                            ]}>
                            {item.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.label}>시술 종류</Text>
            <TreatmentOptionChips
              options={TREATMENT_TYPE_OPTIONS}
              value={selectedType}
              onChange={(type) => {
                setSelectedType(type);
                setTreatmentTitle((prev) =>
                  !prev.trim() || prev === defaultTreatmentTitle(selectedType)
                    ? defaultTreatmentTitle(type)
                    : prev,
                );
              }}
            />

            <Text style={styles.label}>시술명</Text>
            <TextInput
              placeholder={defaultTreatmentTitle(selectedType)}
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={treatmentTitle}
              onChangeText={setTreatmentTitle}
            />
            {titlePresetsForType(selectedType).length ? (
              <TreatmentOptionChips
                options={titlePresetsForType(selectedType)}
                value={treatmentTitle}
                onChange={setTreatmentTitle}
              />
            ) : null}

            <Text style={styles.label}>소요 시간</Text>
            <TreatmentOptionChips
              options={[...DURATION_OPTIONS]}
              value={duration}
              onChange={setDuration}
            />

            <Text style={styles.fieldLabel}>시술 금액</Text>
            <WonAmountInput
              placeholder="금액 입력"
              value={priceText}
              onChangeValue={setPriceText}
            />

            <Pressable
              disabled={isCreating}
              onPress={() => void handleCreate()}
              style={({ pressed }) => [
                styles.createButton,
                pressed && { opacity: 0.88 },
                isCreating && styles.createButtonDisabled,
              ]}>
              {isCreating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>시술 기록 만들기</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setModalVisible(false)} style={styles.cancelLink}>
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <DesignerScreenBackFooter />
      <DesignerBottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
  },
  pageTitle: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 8,
    padding: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTitle: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  typeTileWrap: {
    aspectRatio: 1,
    padding: 4,
    width: '25%',
  },
  typeTile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  typeTilePressed: {
    backgroundColor: '#F5F5F8',
    opacity: 0.92,
  },
  quickIcon: {
    fontSize: 24,
  },
  quickLabel: {
    color: '#1A1A2E',
    fontSize: 12,
    fontWeight: '800',
  },
  footerHint: {
    color: '#6B6B7B',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(26, 26, 46, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 10,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
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
  createButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 12,
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  createButtonDisabled: {
    opacity: 0.65,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelLink: {
    alignItems: 'center',
    paddingTop: 4,
  },
  cancelText: {
    color: colors.muted,
    fontSize: 15,
  },
  customerSearchSpinner: {
    alignSelf: 'flex-start',
    marginTop: -4,
  },
  suggestionBlock: {
    gap: 6,
  },
  suggestionLabel: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  suggestionChip: {
    backgroundColor: '#F5F5F8',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionChipSelected: {
    backgroundColor: '#FFF0F0',
    borderColor: colors.coral,
  },
  suggestionChipText: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '800',
  },
  suggestionChipTextSelected: {
    color: colors.coral,
  },
});
