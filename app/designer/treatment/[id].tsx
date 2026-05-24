import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTreatmentById, Treatment, updateTreatment } from '../../../lib/treatments';

type EditableField = 'technique' | 'designer_diagnosis' | 'home_care';

type InputItem = {
  editable?: EditableField;
  label: string;
  value: string;
  complete: boolean;
};

type InputSection = {
  title: string;
  items: InputItem[];
};

const TOTAL_ITEMS = 6;

function joinProducts(products: string[] | null) {
  return products?.length ? products.join(' · ') : '';
}

function getDraftValue(treatment: Treatment | null, field: EditableField) {
  if (!treatment) {
    return '';
  }

  return treatment[field] ?? '';
}

function FieldCard({ item, onPress }: { item: InputItem; onPress?: () => void }) {
  return (
    <Pressable
      disabled={!item.editable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fieldCard,
        item.complete ? styles.completeCard : styles.requiredCard,
        pressed && styles.fieldCardPressed,
      ]}>
      <View style={[styles.leftBar, item.complete ? styles.completeBar : styles.requiredBar]} />
      <View style={styles.fieldContent}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldLabel}>{item.label}</Text>
          {item.complete ? (
            <Text style={styles.checkMark}>✓</Text>
          ) : (
            <Text style={styles.requiredLabel}>필수</Text>
          )}
        </View>
        <Text style={[styles.fieldValue, !item.complete && styles.emptyValue]}>
          {item.value || '빈 칸'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function DesignerTreatmentInputScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.resolve()
      .then(async () => {
        if (!id) {
          throw new Error('시술 ID가 없습니다.');
        }

        const { user, treatment: nextTreatment } = await getTreatmentById(id);

        if (!isMounted) {
          return;
        }

        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role !== 'designer') {
          router.replace('/home');
          return;
        }

        if (!nextTreatment) {
          setErrorMessage('시술 기록을 찾을 수 없습니다.');
          return;
        }

        setTreatment(nextTreatment);
        setErrorMessage('');
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : '시술 정보를 불러오지 못했습니다.';
        setErrorMessage(message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const sections = useMemo<InputSection[]>(() => {
    const technique = getDraftValue(treatment, 'technique');
    const diagnosis = getDraftValue(treatment, 'designer_diagnosis');
    const homeCare = getDraftValue(treatment, 'home_care');
    const products = joinProducts(treatment?.products ?? null);

    return [
      {
        title: '기본 정보',
        items: [
          {
            label: '시술 종류',
            value: treatment?.treatment_title ?? '',
            complete: Boolean(treatment?.treatment_title),
          },
          {
            label: '소요 시간',
            value: treatment?.duration ?? '',
            complete: Boolean(treatment?.duration),
          },
        ],
      },
      {
        title: '기술 데이터',
        items: [
          {
            label: '사용 약품',
            value: products,
            complete: Boolean(products),
          },
          {
            label: '기법·세팅',
            value: technique,
            complete: Boolean(technique),
            editable: 'technique',
          },
        ],
      },
      {
        title: '전문가 진단',
        items: [
          {
            label: '모발 상태 평가',
            value: diagnosis,
            complete: Boolean(diagnosis),
            editable: 'designer_diagnosis',
          },
          {
            label: '홈케어 가이드',
            value: homeCare,
            complete: Boolean(homeCare),
            editable: 'home_care',
          },
        ],
      },
    ];
  }, [treatment]);

  const allItems = sections.flatMap((section) => section.items);
  const completedCount = allItems.filter((item) => item.complete).length;
  const requiredItems = allItems.filter((item) => item.editable && !item.complete);
  const requiredCount = requiredItems.length;
  const progress = completedCount / TOTAL_ITEMS;
  const canRequestSettlement = requiredCount === 0 && Boolean(treatment);

  const openEditor = (field: EditableField) => {
    setActiveField(field);
    setInputValue(getDraftValue(treatment, field));
  };

  const closeEditor = () => {
    setActiveField(null);
    setInputValue('');
  };

  const handleSaveField = async () => {
    if (!activeField || !treatment) {
      return;
    }

    const trimmedValue = inputValue.trim();

    if (!trimmedValue) {
      Alert.alert('입력 필요', '필수 항목을 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      const updatedTreatment = await updateTreatment(treatment.id, {
        [activeField]: trimmedValue,
      });
      setTreatment(updatedTreatment);
      closeEditor();
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장 중 문제가 발생했습니다.';
      Alert.alert('저장 실패', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestSettlement = async () => {
    if (!treatment || !canRequestSettlement) {
      return;
    }

    try {
      setIsSaving(true);
      await updateTreatment(treatment.id, {
        feedback_completed: true,
        payment_status: 'completed',
      });
      Alert.alert('정산 완료', '정산이 완료되었습니다 ✓', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : '정산 요청 중 문제가 발생했습니다.';
      Alert.alert('정산 실패', message);
    } finally {
      setIsSaving(false);
    }
  };

  const activeFieldLabel = sections
    .flatMap((section) => section.items)
    .find((item) => item.editable === activeField)?.label;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.headerTitle}>시술 입력 · {treatment?.customer_name || '고객'}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#FF5A5F" />
            <Text style={styles.stateText}>시술 정보를 불러오는 중...</Text>
          </View>
        ) : errorMessage || !treatment ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>시술 입력을 열 수 없어요</Text>
            <Text style={styles.stateText}>{errorMessage || '시술 정보가 없습니다.'}</Text>
          </View>
        ) : (
          <>
            <View style={styles.progressBlock}>
              <View style={styles.progressTopRow}>
                <Text style={styles.progressText}>완료 {completedCount}/{TOTAL_ITEMS} 항목</Text>
                <Text style={styles.remainingText}>정산까지 {requiredCount}개</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
            </View>

            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.cardList}>
                  {section.items.map((item) => (
                    <FieldCard
                      key={item.label}
                      item={item}
                      onPress={item.editable ? () => openEditor(item.editable!) : undefined}
                    />
                  ))}
                </View>
              </View>
            ))}

            <Pressable
              disabled={!canRequestSettlement || isSaving}
              onPress={handleRequestSettlement}
              style={[styles.settlementButton, canRequestSettlement && styles.settlementButtonActive]}>
              <Text
                style={[
                  styles.settlementButtonText,
                  canRequestSettlement && styles.settlementButtonTextActive,
                ]}>
                {canRequestSettlement
                  ? '정산 요청하기'
                  : `필수 항목 ${requiredCount}개 입력 후 정산 가능`}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={Boolean(activeField)} onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{activeFieldLabel}</Text>
            <TextInput
              multiline
              onChangeText={setInputValue}
              placeholder="내용을 입력하세요"
              placeholderTextColor="#9B9BA7"
              style={styles.modalInput}
              textAlignVertical="top"
              value={inputValue}
            />
            <View style={styles.modalActions}>
              <Pressable disabled={isSaving} onPress={closeEditor} style={styles.modalCancelButton}>
                <Text style={styles.modalCancelText}>취소</Text>
              </Pressable>
              <Pressable disabled={isSaving} onPress={handleSaveField} style={styles.modalSaveButton}>
                <Text style={styles.modalSaveText}>{isSaving ? '저장 중...' : '저장'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  content: {
    paddingBottom: 36,
    paddingHorizontal: 22,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  closeButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  closeText: {
    color: '#1A1A2E',
    fontSize: 28,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#1A1A2E',
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  progressBlock: {
    marginBottom: 28,
  },
  progressTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
  },
  remainingText: {
    color: '#FF5A5F',
    fontSize: 16,
    fontWeight: '900',
  },
  progressTrack: {
    height: 4,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E6E6EE',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#00C2A8',
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardList: {
    gap: 12,
  },
  fieldCard: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  fieldCardPressed: {
    opacity: 0.84,
  },
  completeCard: {
    backgroundColor: '#CCF2EC',
  },
  requiredCard: {
    borderWidth: 1,
    borderColor: '#FFD4D5',
  },
  leftBar: {
    width: 3,
  },
  completeBar: {
    backgroundColor: '#00C2A8',
  },
  requiredBar: {
    backgroundColor: '#FF5A5F',
  },
  fieldContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fieldHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  checkMark: {
    color: '#00C2A8',
    fontSize: 18,
    fontWeight: '900',
  },
  requiredLabel: {
    color: '#FF5A5F',
    fontSize: 13,
    fontWeight: '900',
  },
  fieldValue: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  emptyValue: {
    color: '#6B6B7B',
  },
  settlementButton: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#CCCCCC',
    marginTop: 4,
    paddingVertical: 17,
  },
  settlementButtonActive: {
    backgroundColor: '#00C2A8',
  },
  settlementButtonText: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '900',
  },
  settlementButtonTextActive: {
    color: '#FFFFFF',
  },
  stateBox: {
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    gap: 10,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  stateTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#6B6B7B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.36)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 30,
  },
  modalTitle: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 14,
  },
  modalInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#E3E3EA',
    borderRadius: 16,
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#F0F0F4',
    paddingVertical: 15,
  },
  modalCancelText: {
    color: '#6B6B7B',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSaveButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#00C2A8',
    paddingVertical: 15,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
