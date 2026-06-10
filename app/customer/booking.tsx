import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createCustomerBooking,
  listAvailableBookingSlots,
  listBookableStores,
  listBookingDates,
  loadBookableDesignerProfile,
  type BookableDesignerProfile,
  type BookingTimeSlot,
  type DesignerMatchResult,
} from '../../lib/customer-booking';
import {
  formatBookingMenuLabel,
  getDesignerBookingMenu,
  listEnabledBookingCategories,
  listEnabledBookingMenuItems,
  resolveBookingMenuSelection,
  type DesignerBookingMenuConfig,
} from '../../lib/designer-booking-menu';
import {
  matchDesignersForCustomer,
  matchNearbyDesignersForStore,
} from '../../lib/customer-designer-match';
import { getErrorMessage } from '../../lib/errors';
import { getAdminDesignerRoster } from '../../lib/org-designer-roster';
import { formatStoreRegionLine } from '../../lib/org-store-affiliation';
import { getTreatments, type Treatment } from '../../lib/treatments';
import { colors } from '../../lib/theme';
import { BottomTabBar } from '../../src/components/bottom-tab-bar';
import { TAB_BAR_BOTTOM_INSET } from '../../src/components/role-bottom-tab-bar';
import { EmptyState } from '../../src/components/empty-state';
import { LoadingState } from '../../src/components/loading-state';
import { TreatmentOptionChips } from '../../src/components/treatment-option-chips';

type BookingMode = 'nearby' | 'ai';
type BookingStep = 'browse' | 'designer' | 'schedule' | 'done';

export default function CustomerBookingScreen() {
  const insets = useSafeAreaInsets();
  const stores = useMemo(() => listBookableStores(), []);
  const bookingDates = useMemo(() => listBookingDates(14), []);

  const [mode, setMode] = useState<BookingMode>('nearby');
  const [step, setStep] = useState<BookingStep>('browse');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState(stores[0]?.id ?? '');
  const [nearbyDesigners, setNearbyDesigners] = useState<DesignerMatchResult[]>([]);
  const [aiMatches, setAiMatches] = useState<DesignerMatchResult[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [selectedDesigner, setSelectedDesigner] = useState<BookableDesignerProfile | null>(null);
  const [designerMenu, setDesignerMenu] = useState<DesignerBookingMenuConfig | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [selectedDateKey, setSelectedDateKey] = useState(bookingDates[0]?.key ?? '');
  const [selectedSlot, setSelectedSlot] = useState<BookingTimeSlot | null>(null);
  const [completedTreatmentId, setCompletedTreatmentId] = useState<string | null>(null);

  const enabledCategories = useMemo(
    () => (designerMenu ? listEnabledBookingCategories(designerMenu) : []),
    [designerMenu],
  );

  const menuItems = useMemo(() => {
    if (!designerMenu || !selectedCategory) {
      return [];
    }

    return listEnabledBookingMenuItems(designerMenu, selectedCategory);
  }, [designerMenu, selectedCategory]);

  const selectedMenu = useMemo(() => {
    if (!designerMenu || !selectedCategory || !selectedMenuItemId) {
      return null;
    }

    return resolveBookingMenuSelection(designerMenu, selectedCategory, selectedMenuItemId);
  }, [designerMenu, selectedCategory, selectedMenuItemId]);

  const slots = useMemo(() => {
    if (!selectedDesigner || !selectedDateKey) {
      return [];
    }

    return listAvailableBookingSlots(selectedDesigner.id, selectedDateKey);
  }, [selectedDateKey, selectedDesigner]);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      const { user, treatments: rows } = await getTreatments();

      if (!user) {
        router.replace('/');
        return;
      }

      setTreatments(rows);
      setErrorMessage('');

      const [nearby, aiResult] = await Promise.all([
        selectedStoreId ? matchNearbyDesignersForStore(selectedStoreId, rows) : Promise.resolve([]),
        matchDesignersForCustomer(rows, { otherRegionsOnly: true, limit: 6 }),
      ]);

      setNearbyDesigners(nearby);
      setAiMatches(aiResult.matches);
      setAiSummary(aiResult.styleSummary);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '예약 정보를 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedStoreId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleSelectStore = useCallback(
    async (storeId: string) => {
      setSelectedStoreId(storeId);

      try {
        const nearby = await matchNearbyDesignersForStore(storeId, treatments);
        setNearbyDesigners(nearby);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, '디자이너 목록을 불러오지 못했습니다.'));
      }
    },
    [treatments],
  );

  const handleSelectDesigner = useCallback(async (designerId: string) => {
    const rosterEntry = getAdminDesignerRoster().find((entry) => entry.id === designerId);

    if (!rosterEntry) {
      return;
    }

    try {
      const [profile, menu] = await Promise.all([
        loadBookableDesignerProfile(rosterEntry),
        getDesignerBookingMenu(designerId),
      ]);
      const categories = listEnabledBookingCategories(menu);
      const firstCategory = categories[0];

      setSelectedDesigner(profile);
      setDesignerMenu(menu);
      setSelectedCategory(firstCategory?.category ?? '');
      setSelectedMenuItemId(
        firstCategory
          ? listEnabledBookingMenuItems(menu, firstCategory.category)[0]?.id ?? ''
          : '',
      );
      setSelectedSlot(null);
      setStep('designer');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '디자이너 정보를 불러오지 못했습니다.'));
    }
  }, []);

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedDesigner || !selectedSlot || !selectedDateKey || !selectedMenu) {
      return;
    }

    setIsSubmitting(true);

    try {
      const treatment = await createCustomerBooking({
        designerId: selectedDesigner.id,
        designerName: selectedDesigner.name,
        dateKey: selectedDateKey,
        slot: selectedSlot,
        treatmentType: selectedMenu.category,
        treatmentTitle: selectedMenu.itemName,
        duration: selectedMenu.duration,
      });

      setCompletedTreatmentId(treatment.id);
      setStep('done');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '예약을 완료하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDateKey, selectedDesigner, selectedMenu, selectedSlot]);

  const resetFlow = useCallback(() => {
    setStep('browse');
    setSelectedDesigner(null);
    setDesignerMenu(null);
    setSelectedCategory('');
    setSelectedMenuItemId('');
    setSelectedSlot(null);
    setCompletedTreatmentId(null);
  }, []);

  const handleSelectCategory = useCallback(
    (category: string) => {
      setSelectedCategory(category);

      if (!designerMenu) {
        setSelectedMenuItemId('');
        return;
      }

      const firstItem = listEnabledBookingMenuItems(designerMenu, category)[0];
      setSelectedMenuItemId(firstItem?.id ?? '');
    },
    [designerMenu],
  );

  const renderDesignerCard = (
    designer: DesignerMatchResult | BookableDesignerProfile,
    options?: { showMatch?: boolean },
  ) => (
    <Pressable
      key={designer.id}
      onPress={() => void handleSelectDesigner(designer.id)}
      style={({ pressed }) => [styles.designerCard, pressed && styles.cardPressed]}>
      <View style={styles.designerCardHeader}>
        <View style={styles.designerAvatar}>
          <Text style={styles.designerAvatarText}>{designer.name.trim().slice(0, 1) || '?'}</Text>
        </View>
        <View style={styles.designerCardBody}>
          <Text style={styles.designerName}>{designer.name}</Text>
          <Text style={styles.designerMeta}>
            {designer.storeName} · {designer.storeRegion}
          </Text>
          {designer.specialtyTypes.length > 0 ? (
            <Text style={styles.designerSpecialty}>
              {designer.specialtyTypes.join(' · ')} · 시술 {designer.treatmentCount}건
            </Text>
          ) : null}
        </View>
      </View>
      {options?.showMatch && 'matchReason' in designer ? (
        <Text style={styles.matchReason}>{designer.matchReason}</Text>
      ) : null}
      {designer.recentTitles.length > 0 ? (
        <Text numberOfLines={2} style={styles.recentTitles}>
          최근: {designer.recentTitles.slice(0, 3).join(' · ')}
        </Text>
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_BOTTOM_INSET,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>예약</Text>
        <Text style={styles.subtitle}>
          주변 디자이너 이력을 보고 직접 예약하거나, AI가 스타일에 맞는 타 지역 디자이너를 추천해 드려요.
        </Text>

        {step === 'browse' ? (
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode('nearby')}
              style={[styles.modeChip, mode === 'nearby' && styles.modeChipSelected]}>
              <Text style={[styles.modeChipText, mode === 'nearby' && styles.modeChipTextSelected]}>
                주변 예약
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('ai')}
              style={[styles.modeChip, mode === 'ai' && styles.modeChipSelected]}>
              <Text style={[styles.modeChipText, mode === 'ai' && styles.modeChipTextSelected]}>
                AI 추천
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={resetFlow} style={styles.backLink}>
            <Text style={styles.backLinkText}>‹ 예약 목록</Text>
          </Pressable>
        )}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {isLoading ? (
          <LoadingState message="불러오는 중..." />
        ) : step === 'done' ? (
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>예약이 완료됐어요</Text>
            <Text style={styles.doneText}>
              {selectedDesigner?.name} 디자이너 · {selectedDateKey.replaceAll('-', '.')}{' '}
              {selectedSlot?.label}
              {selectedMenu ? ` · ${formatBookingMenuLabel(selectedMenu)}` : ''}
            </Text>
            <Pressable
              onPress={() =>
                completedTreatmentId
                  ? router.push(`/treatment/${completedTreatmentId}`)
                  : router.push('/home')
              }
              style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>예약 내역 보기</Text>
            </Pressable>
            <Pressable onPress={resetFlow} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>다른 예약하기</Text>
            </Pressable>
          </View>
        ) : step === 'schedule' && selectedDesigner ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{selectedDesigner.name} · 예약 시간</Text>
            <Text style={styles.sectionMeta}>{selectedDesigner.storeName}</Text>

            <Text style={styles.fieldLabel}>시술 카테고리</Text>
            {enabledCategories.length === 0 ? (
              <EmptyState
                title="예약 가능한 메뉴가 없어요"
                subtitle="디자이너가 예약 메뉴를 설정하면 선택할 수 있어요."
              />
            ) : (
              <TreatmentOptionChips
                options={enabledCategories.map((category) => ({
                  icon: category.icon,
                  label: category.category,
                }))}
                value={selectedCategory}
                onChange={handleSelectCategory}
              />
            )}

            {menuItems.length > 0 ? (
              <>
                <Text style={styles.fieldLabel}>세부 메뉴</Text>
                <TreatmentOptionChips
                  options={menuItems.map((item) => item.name)}
                  value={menuItems.find((item) => item.id === selectedMenuItemId)?.name ?? ''}
                  onChange={(name) => {
                    const match = menuItems.find((item) => item.name === name);
                    setSelectedMenuItemId(match?.id ?? '');
                  }}
                />
              </>
            ) : null}

            {selectedMenu ? (
              <Text style={styles.menuSummary}>
                선택 메뉴: {formatBookingMenuLabel(selectedMenu)} · {selectedMenu.duration}
              </Text>
            ) : null}

            <Text style={styles.fieldLabel}>날짜</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {bookingDates.map((date) => {
                const selected = selectedDateKey === date.key;

                return (
                  <Pressable
                    key={date.key}
                    onPress={() => {
                      setSelectedDateKey(date.key);
                      setSelectedSlot(null);
                    }}
                    style={[styles.dateChip, selected && styles.dateChipSelected]}>
                    <Text style={[styles.dateChipWeekday, selected && styles.dateChipTextSelected]}>
                      {date.weekday}
                    </Text>
                    <Text style={[styles.dateChipLabel, selected && styles.dateChipTextSelected]}>
                      {date.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.fieldLabel}>시간</Text>
            {slots.length === 0 ? (
              <EmptyState subtitle="다른 날짜를 선택해 주세요" title="빈 시간대가 없어요" />
            ) : (
              <View style={styles.slotGrid}>
                {slots.map((slot) => {
                  const selected = selectedSlot?.key === slot.key;

                  return (
                    <Pressable
                      key={slot.key}
                      onPress={() => setSelectedSlot(slot)}
                      style={[styles.slotChip, selected && styles.slotChipSelected]}>
                      <Text style={[styles.slotChipText, selected && styles.slotChipTextSelected]}>
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              disabled={!selectedSlot || !selectedMenu || isSubmitting}
              onPress={() => void handleConfirmBooking()}
              style={[
                styles.primaryButton,
                (!selectedSlot || !selectedMenu || isSubmitting) && styles.primaryButtonDisabled,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>예약 확정</Text>
              )}
            </Pressable>
          </View>
        ) : step === 'designer' && selectedDesigner ? (
          <View style={styles.section}>
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>{selectedDesigner.name}</Text>
              <Text style={styles.profileMeta}>
                {selectedDesigner.storeName} · {selectedDesigner.hotPlace}
              </Text>
              {selectedDesigner.specialtyTypes.length > 0 ? (
                <Text style={styles.profileSpecialty}>
                  주요 시술 {selectedDesigner.specialtyTypes.join(' · ')}
                </Text>
              ) : null}
              {selectedDesigner.recentTitles.length > 0 ? (
                <View style={styles.historyBlock}>
                  <Text style={styles.historyTitle}>최근 시술 이력</Text>
                  {selectedDesigner.recentTitles.map((title, index) => (
                    <Text key={`recent-title-${index}`} style={styles.historyItem}>
                      · {title}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
            <Pressable onPress={() => setStep('schedule')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>빈 시간대 선택</Text>
            </Pressable>
          </View>
        ) : mode === 'nearby' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>주변 매장</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeScroll}>
              {stores.map((store) => {
                const selected = selectedStoreId === store.id;

                return (
                  <Pressable
                    key={store.id}
                    onPress={() => void handleSelectStore(store.id)}
                    style={[styles.storeChip, selected && styles.storeChipSelected]}>
                    <Text style={[styles.storeChipTitle, selected && styles.storeChipTextSelected]}>
                      {store.name}
                    </Text>
                    <Text style={[styles.storeChipMeta, selected && styles.storeChipTextSelected]}>
                      {formatStoreRegionLine(store)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>디자이너 선택</Text>
            {nearbyDesigners.length === 0 ? (
              <EmptyState subtitle="다른 매장을 선택해 보세요" title="표시할 디자이너가 없어요" />
            ) : (
              nearbyDesigners.map((designer) => renderDesignerCard(designer))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.aiBanner}>
              <Text style={styles.aiBadge}>AI 스타일 매칭</Text>
              <Text style={styles.aiSummary}>{aiSummary}</Text>
              <Text style={styles.aiHint}>평소 시술과 다른 지역 디자이너를 우선 추천합니다.</Text>
            </View>
            {aiMatches.length === 0 ? (
              <EmptyState subtitle="시술 기록이 쌓이면 더 정확해져요" title="추천 디자이너가 없어요" />
            ) : (
              aiMatches.map((designer) => renderDesignerCard(designer, { showMatch: true }))
            )}
          </View>
        )}
      </ScrollView>
      <BottomTabBar />
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
    paddingHorizontal: 20,
  },
  title: {
    color: '#1A1A2E',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeChipSelected: {
    backgroundColor: '#FFE8E9',
    borderColor: colors.coral,
  },
  modeChipText: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '800',
  },
  modeChipTextSelected: {
    color: colors.coral,
  },
  backLink: {
    alignSelf: 'flex-start',
  },
  backLinkText: {
    color: '#6B6B7B',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: -8,
  },
  storeScroll: {
    flexGrow: 0,
  },
  storeChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
    maxWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  storeChipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  storeChipTitle: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
  },
  storeChipMeta: {
    color: '#6B6B7B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  storeChipTextSelected: {
    color: '#0284C7',
  },
  designerCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  cardPressed: {
    opacity: 0.92,
  },
  designerCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  designerAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFD4D5',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  designerAvatarText: {
    color: colors.coral,
    fontSize: 18,
    fontWeight: '900',
  },
  designerCardBody: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  designerName: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '900',
  },
  designerMeta: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  designerSpecialty: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '700',
  },
  matchReason: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  recentTitles: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  aiBanner: {
    backgroundColor: '#F5F3FF',
    borderColor: '#E0D7FA',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  aiBadge: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '900',
  },
  aiSummary: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  aiHint: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  profileName: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
  },
  profileMeta: {
    color: '#6B6B7B',
    fontSize: 13,
    fontWeight: '600',
  },
  profileSpecialty: {
    color: colors.mint,
    fontSize: 13,
    fontWeight: '800',
  },
  historyBlock: {
    gap: 4,
    marginTop: 6,
  },
  historyTitle: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '800',
  },
  historyItem: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  menuSummary: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '700',
  },
  dateScroll: {
    flexGrow: 0,
  },
  dateChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dateChipSelected: {
    backgroundColor: '#FFE8E9',
    borderColor: colors.coral,
  },
  dateChipWeekday: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  dateChipLabel: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  dateChipTextSelected: {
    color: colors.coral,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 10,
    borderWidth: 1,
    minWidth: '22%',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  slotChipSelected: {
    backgroundColor: '#E8FAF7',
    borderColor: colors.mint,
  },
  slotChipText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  slotChipTextSelected: {
    color: '#00A88F',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#E8E8F0',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  doneCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  doneTitle: {
    color: '#1A1A2E',
    fontSize: 20,
    fontWeight: '900',
  },
  doneText: {
    color: '#6B6B7B',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
});
