import { router } from 'expo-router';
import { useState } from 'react';
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
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
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

  const openCreateModal = (type: string) => {
    setSelectedType(type);
    setDuration(DEFAULT_TREATMENT_DURATION);
    setTreatmentTitle(defaultTreatmentTitle(type));
    setPriceText('');
    setModalVisible(true);
  };

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
        treatmentType: selectedType,
        treatmentTitle: treatmentTitle.trim() || defaultTreatmentTitle(selectedType),
        duration,
        price,
      });

      setModalVisible(false);
      setCustomerName('');
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
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>새 시술 입력</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>어떤 시술을 추가할까요?</Text>
          <Text style={styles.heroSubtitle}>
            고객 이름을 입력하면 시술 기록이 생성됩니다. 가입 전이면 초대 코드로 연결하세요.
          </Text>
        </View>

        <View style={styles.grid}>
          {TREATMENT_TYPE_OPTIONS.map((item) => (
            <Pressable
              key={item.label}
              disabled={isCreating}
              onPress={() => openCreateModal(item.label)}
              style={({ pressed }) => [styles.quickButton, pressed && styles.quickButtonPressed]}>
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.footerHint}>생성 후 시술 상세에서 입력·초대·결제 요청을 진행하세요</Text>
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
              onChangeText={setCustomerName}
            />

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

            <Text style={styles.label}>시술 금액</Text>
            <WonAmountInput
              placeholder="금액 입력"
              style={styles.priceInput}
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
    gap: 10,
  },
  quickButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    gap: 8,
    height: 108,
    justifyContent: 'center',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '48%',
  },
  quickButtonPressed: {
    opacity: 0.82,
  },
  quickIcon: {
    fontSize: 28,
  },
  quickLabel: {
    color: '#1A1A2E',
    fontSize: 15,
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
  input: {
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  priceInput: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
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
});
