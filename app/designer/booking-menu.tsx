import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCurrentUser } from '../../lib/auth';
import {
  createDefaultDesignerBookingMenu,
  getDesignerBookingMenu,
  saveDesignerBookingMenu,
  type DesignerBookingMenuCategory,
  type DesignerBookingMenuConfig,
  type DesignerBookingMenuItem,
} from '../../lib/designer-booking-menu';
import { showConfirmAlert, showErrorAlert, showWarningAlert } from '../../lib/alerts';
import { getErrorMessage } from '../../lib/errors';
import { colors } from '../../lib/theme';
import { DEFAULT_TREATMENT_DURATION, DURATION_OPTIONS } from '../../lib/treatment-options';
import { DesignerBottomTabBar } from '../../src/components/designer-bottom-tab-bar';
import { LoadingState } from '../../src/components/loading-state';
import { TreatmentOptionChips } from '../../src/components/treatment-option-chips';

function createMenuItemId(category: string, name: string) {
  return `${category}-${name}`.trim().toLowerCase().replace(/\s+/g, '-');
}

export default function DesignerBookingMenuScreen() {
  const insets = useSafeAreaInsets();
  const [config, setConfig] = useState<DesignerBookingMenuConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});
  const [durationPicker, setDurationPicker] = useState<{
    categoryId: string;
    itemId: string;
    itemName: string;
  } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      const user = await getCurrentUser();

      if (!user) {
        router.replace('/');
        return;
      }

      if (user.role !== 'designer') {
        router.replace('/customer-home');
        return;
      }

      const menu = await getDesignerBookingMenu(user.id);
      setConfig(menu);
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '예약 메뉴를 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const updateCategory = useCallback(
    (categoryId: string, updater: (category: DesignerBookingMenuCategory) => DesignerBookingMenuCategory) => {
      setConfig((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          categories: current.categories.map((category) =>
            category.id === categoryId ? updater(category) : category,
          ),
        };
      });
    },
    [],
  );

  const handleAddItem = (category: DesignerBookingMenuCategory) => {
    const name = newItemNames[category.id]?.trim();

    if (!name) {
      showWarningAlert('메뉴 이름을 입력해 주세요.');
      return;
    }

    updateCategory(category.id, (current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: createMenuItemId(current.category, name),
          name,
          duration: current.items[0]?.duration ?? DEFAULT_TREATMENT_DURATION,
          enabled: true,
        },
      ],
    }));

    setNewItemNames((current) => ({ ...current, [category.id]: '' }));
  };

  const handleRemoveItem = (categoryId: string, itemId: string) => {
    updateCategory(categoryId, (category) => ({
      ...category,
      items: category.items.filter((item) => item.id !== itemId),
    }));
  };

  const handleToggleItem = (categoryId: string, itemId: string, enabled: boolean) => {
    updateCategory(categoryId, (category) => ({
      ...category,
      items: category.items.map((item) =>
        item.id === itemId ? { ...item, enabled } : item,
      ),
    }));
  };

  const handleDurationChange = (categoryId: string, itemId: string, duration: string) => {
    updateCategory(categoryId, (category) => ({
      ...category,
      items: category.items.map((item) =>
        item.id === itemId ? { ...item, duration } : item,
      ),
    }));
    setDurationPicker(null);
  };

  const selectedDurationItem =
    durationPicker && config
      ? config.categories
          .find((category) => category.id === durationPicker.categoryId)
          ?.items.find((item) => item.id === durationPicker.itemId) ?? null
      : null;

  const handleSave = async () => {
    if (!config) {
      return;
    }

    setIsSaving(true);

    try {
      const saved = await saveDesignerBookingMenu(config);
      setConfig(saved);
      showWarningAlert('예약 메뉴가 저장됐어요.');
    } catch (error) {
      showErrorAlert(getErrorMessage(error, '예약 메뉴를 저장하지 못했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!config) {
      return;
    }

    showConfirmAlert({
      title: '기본 메뉴로 초기화',
      message: '펌·컬러 등 기본 메뉴 구성으로 되돌릴까요?',
      confirmLabel: '초기화',
      destructive: true,
      onConfirm: () => {
        setConfig(createDefaultDesignerBookingMenu(config.designerId));
      },
    });
  };

  const renderMenuItem = (category: DesignerBookingMenuCategory, item: DesignerBookingMenuItem) => (
    <View key={item.id} style={styles.menuItemRow}>
      <View style={styles.menuItemBody}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <Pressable
          hitSlop={6}
          onPress={() =>
            setDurationPicker({
              categoryId: category.id,
              itemId: item.id,
              itemName: item.name,
            })
          }
          style={({ pressed }) => [styles.durationButton, pressed && styles.durationButtonPressed]}>
          <Text style={styles.durationButtonText}>{item.duration}</Text>
          <Text style={styles.durationButtonHint}>변경</Text>
        </Pressable>
      </View>
      <Switch
        value={item.enabled}
        onValueChange={(value) => handleToggleItem(category.id, item.id, value)}
        trackColor={{ false: '#E5E7EB', true: '#FECACA' }}
        thumbColor={item.enabled ? colors.coral : '#FFFFFF'}
      />
      <Pressable
        hitSlop={8}
        onPress={() => handleRemoveItem(category.id, item.id)}
        style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}>
        <Text style={styles.removeButtonText}>삭제</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 120 },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable hitSlop={8} onPress={() => router.back()}>
            <Text style={styles.backLink}>‹ 뒤로</Text>
          </Pressable>
          <Text style={styles.title}>예약 메뉴 설정</Text>
          <Text style={styles.subtitle}>
            고객 예약 화면에 노출할 시술 카테고리와 세부 메뉴를 설정하세요. 예: 펌 → 일반펌, 열펌
          </Text>
        </View>

        {isLoading || !config ? (
          <LoadingState message="메뉴 불러오는 중..." />
        ) : (
          <>
            {config.categories.map((category) => (
              <View key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryTitleWrap}>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={styles.categoryTitle}>{category.category}</Text>
                  </View>
                  <Switch
                    value={category.enabled}
                    onValueChange={(value) =>
                      updateCategory(category.id, (current) => ({ ...current, enabled: value }))
                    }
                    trackColor={{ false: '#E5E7EB', true: '#FECACA' }}
                    thumbColor={category.enabled ? colors.coral : '#FFFFFF'}
                  />
                </View>

                {category.enabled ? (
                  <>
                    <View style={styles.menuList}>
                      {category.items.map((item) => renderMenuItem(category, item))}
                    </View>

                    <View style={styles.addRow}>
                      <TextInput
                        value={newItemNames[category.id] ?? ''}
                        onChangeText={(text) =>
                          setNewItemNames((current) => ({ ...current, [category.id]: text }))
                        }
                        placeholder={`${category.category} 메뉴 추가`}
                        placeholderTextColor="#9CA3AF"
                        style={styles.addInput}
                      />
                      <Pressable
                        onPress={() => handleAddItem(category)}
                        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
                        <Text style={styles.addButtonText}>추가</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Text style={styles.disabledHint}>카테고리가 꺼져 있어 고객에게 보이지 않아요.</Text>
                )}
              </View>
            ))}

            <Pressable
              disabled={isSaving}
              onPress={() => void handleSave()}
              style={({ pressed }) => [
                styles.saveButton,
                isSaving && styles.saveButtonDisabled,
                pressed && !isSaving && styles.saveButtonPressed,
              ]}>
              <Text style={styles.saveButtonText}>{isSaving ? '저장 중...' : '메뉴 저장'}</Text>
            </Pressable>

            <Pressable onPress={handleReset} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>기본 메뉴로 초기화</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      <DesignerBottomTabBar />

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(durationPicker)}
        onRequestClose={() => setDurationPicker(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDurationPicker(null)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>소요 시간</Text>
            {durationPicker ? (
              <Text style={styles.modalSubtitle}>{durationPicker.itemName}</Text>
            ) : null}
            {selectedDurationItem ? (
              <TreatmentOptionChips
                options={[...DURATION_OPTIONS]}
                value={selectedDurationItem.duration}
                onChange={(duration) =>
                  handleDurationChange(durationPicker!.categoryId, durationPicker!.itemId, duration)
                }
              />
            ) : null}
            <Pressable
              onPress={() => setDurationPicker(null)}
              style={({ pressed }) => [styles.modalCloseButton, pressed && { opacity: 0.9 }]}>
              <Text style={styles.modalCloseButtonText}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFC',
    flex: 1,
  },
  content: {
    gap: 14,
    paddingHorizontal: 18,
  },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  backLink: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: '800',
  },
  title: {
    color: '#1A1A2E',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  categoryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryTitleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryTitle: {
    color: '#1A1A2E',
    fontSize: 17,
    fontWeight: '900',
  },
  menuList: {
    gap: 8,
  },
  menuItemRow: {
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderColor: '#EEF0F4',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  menuItemBody: {
    flex: 1,
    gap: 2,
  },
  menuItemName: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  durationButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationButtonPressed: {
    opacity: 0.88,
  },
  durationButtonText: {
    color: '#1A1A2E',
    fontSize: 11,
    fontWeight: '800',
  },
  durationButtonHint: {
    color: colors.coral,
    fontSize: 10,
    fontWeight: '800',
  },
  removeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  removeButtonPressed: {
    opacity: 0.85,
  },
  removeButtonText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addInput: {
    backgroundColor: '#FAFAFC',
    borderColor: '#E8E8F0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#1A1A2E',
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderColor: colors.coral,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  addButtonText: {
    color: colors.coral,
    fontSize: 13,
    fontWeight: '900',
  },
  disabledHint: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 14,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonPressed: {
    opacity: 0.92,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetButtonText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.45)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    gap: 12,
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: '#F5F5F8',
    borderRadius: 10,
    marginTop: 4,
    paddingVertical: 12,
  },
  modalCloseButtonText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '800',
  },
});
