import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatSalesAmount } from '../../lib/currency-input';
import type { OrgScope } from '../../lib/org-access';
import type { OrgMonthlySalesCatalogItem, OrgMonthlySalesSummary } from '../../lib/org-monthly-sales';
import {
  fetchOrgSegmentDayRows,
  fetchOrgSegmentWeekRows,
  type SegmentDayRow,
  type SegmentWeekRow,
} from '../../lib/org-sales-segment-drilldown';
import { buildSalesFilterContext } from '../../lib/build-sales-filter-context';
import type { SalesFilterContext } from '../../lib/org-sales-filter-context';
import { formatWeekRangeLabel, type OrgWeeklySalesSummary, type SalesPeriodMode, type WeeklySalesSegment } from '../../lib/org-weekly-sales';

export type { SalesFilterContext } from '../../lib/org-sales-filter-context';
export type { SalesPeriodMode } from '../../lib/org-weekly-sales';

type DrillLevel = 'summary' | 'weeks' | 'days';

type WeeklySalesTabBarProps = {
  scope: OrgScope;
  storeOrgId?: string;
  weeklySummary: OrgWeeklySalesSummary;
  /** 선택된 주(월요일 기준) */
  selectedWeekStart?: string;
  /** 이번 주(상한선) — 다음 주 이동 방지 */
  maxWeekStart?: string;
  onSelectWeekStart?: (weekStart: string) => void;
  weeklySegment: WeeklySalesSegment;
  onWeeklySegmentChange: (segment: WeeklySalesSegment) => void;
  periodMode: SalesPeriodMode;
  onPeriodModeChange: (mode: SalesPeriodMode) => void;
  monthlyCatalog?: OrgMonthlySalesCatalogItem[];
  monthlySummary?: OrgMonthlySalesSummary | null;
  selectedMonthKey?: string;
  onSelectMonthKey?: (monthKey: string) => void;
  monthSearchQuery?: string;
  onMonthSearchQueryChange?: (query: string) => void;
  onSalesFilterContextChange?: (context: SalesFilterContext) => void;
};

const SEGMENTS: {
  key: WeeklySalesSegment;
  label: string;
  hint: string;
}[] = [
  {
    key: 'weekday',
    label: '평일',
    hint: '월~금',
  },
  {
    key: 'weekend',
    label: '주말',
    hint: '토~일',
  },
];

const PERIOD_MODES: { key: SalesPeriodMode; label: string }[] = [
  { key: 'weekly', label: '이번 주 매출' },
  { key: 'monthly', label: '월별 매출' },
];

const MONTHS_PER_PAGE = 4;
const WEEKS_PER_PAGE = 4;
const WEEK_CATALOG_SIZE = 12;

function addDaysFromLocal(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function buildRecentWeekCatalog(maxWeekStart: string) {
  // 최신(이번 주)부터 과거로 정렬
  const result: { weekStart: string; label: string }[] = [];
  for (let index = 0; index < WEEK_CATALOG_SIZE; index += 1) {
    const weekStart = addDaysFromLocal(maxWeekStart, -7 * index);
    result.push({ weekStart, label: formatWeekRangeLabel(weekStart) });
  }
  return result;
}

function segmentLabel(segment: WeeklySalesSegment) {
  return segment === 'weekend' ? '주말' : '평일';
}

function resolveDrillContextSegment(
  openDrillSegment: WeeklySalesSegment | null,
  weeklySegment: WeeklySalesSegment,
) {
  return openDrillSegment ?? weeklySegment;
}

export function WeeklySalesTabBar({
  scope,
  storeOrgId,
  weeklySummary,
  selectedWeekStart,
  maxWeekStart,
  onSelectWeekStart,
  weeklySegment,
  onWeeklySegmentChange,
  periodMode,
  onPeriodModeChange,
  monthlyCatalog = [],
  monthlySummary = null,
  selectedMonthKey,
  onSelectMonthKey,
  monthSearchQuery = '',
  onMonthSearchQueryChange,
  onSalesFilterContextChange,
}: WeeklySalesTabBarProps) {
  const activeMonthKey = selectedMonthKey ?? monthlyCatalog[0]?.monthKey;
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('summary');
  const [weekRows, setWeekRows] = useState<SegmentWeekRow[]>([]);
  const [dayRows, setDayRows] = useState<SegmentDayRow[]>([]);
  const [selectedWeekKey, setSelectedWeekKey] = useState('');
  const [selectedWeekLabel, setSelectedWeekLabel] = useState('');
  const [isDrillLoading, setIsDrillLoading] = useState(false);
  const [openDrillSegment, setOpenDrillSegment] = useState<WeeklySalesSegment | null>(null);
  const [monthPage, setMonthPage] = useState(0);
  const [weekPage, setWeekPage] = useState(0);
  const drillLoadGenerationRef = useRef(0);

  const monthPageCount = Math.max(1, Math.ceil(monthlyCatalog.length / MONTHS_PER_PAGE));
  const monthPageIndex = Math.min(monthPage, monthPageCount - 1);
  const monthCatalogKeys = useMemo(
    () => monthlyCatalog.map((month) => month.monthKey).join(','),
    [monthlyCatalog],
  );

  const visibleMonths = useMemo(() => {
    const start = monthPageIndex * MONTHS_PER_PAGE;

    return monthlyCatalog.slice(start, start + MONTHS_PER_PAGE);
  }, [monthPageIndex, monthlyCatalog]);

  const canGoPrevMonthPage = monthPageIndex > 0;
  const canGoNextMonthPage = monthPageIndex < monthPageCount - 1;

  const resolvedMaxWeekStart = maxWeekStart ?? weeklySummary.weekStart;
  const weekCatalog = useMemo(
    () => buildRecentWeekCatalog(resolvedMaxWeekStart),
    [resolvedMaxWeekStart],
  );
  const activeWeekStart = selectedWeekStart ?? weeklySummary.weekStart;
  const selectedWeekIndex = useMemo(
    () => weekCatalog.findIndex((week) => week.weekStart === activeWeekStart),
    [activeWeekStart, weekCatalog],
  );
  const weekPageCount = Math.max(1, Math.ceil(weekCatalog.length / WEEKS_PER_PAGE));
  const weekPageIndex = Math.min(weekPage, weekPageCount - 1);
  const visibleWeeks = useMemo(() => {
    const start = weekPageIndex * WEEKS_PER_PAGE;
    return weekCatalog.slice(start, start + WEEKS_PER_PAGE);
  }, [weekCatalog, weekPageIndex]);
  const canGoPrevWeekPage = weekPageIndex > 0;
  const canGoNextWeekPage = weekPageIndex < weekPageCount - 1;

  useEffect(() => {
    if (selectedWeekIndex >= 0) {
      setWeekPage(Math.floor(selectedWeekIndex / WEEKS_PER_PAGE));
    }
  }, [selectedWeekIndex]);

  useEffect(() => {
    if (monthPage !== monthPageIndex) {
      setMonthPage(monthPageIndex);
    }
  }, [monthPage, monthPageIndex]);

  useEffect(() => {
    if (!activeMonthKey || monthlyCatalog.length === 0) {
      return;
    }

    const selectedIndex = monthlyCatalog.findIndex((month) => month.monthKey === activeMonthKey);

    if (selectedIndex < 0) {
      setMonthPage(0);
      return;
    }

    setMonthPage(Math.floor(selectedIndex / MONTHS_PER_PAGE));
  }, [activeMonthKey, monthCatalogKeys, monthlyCatalog]);

  const resetDrill = useCallback(() => {
    setDrillLevel('summary');
    setOpenDrillSegment(null);
    setWeekRows([]);
    setDayRows([]);
    setSelectedWeekKey('');
    setSelectedWeekLabel('');
    setIsDrillLoading(false);
    drillLoadGenerationRef.current += 1;
  }, []);

  useEffect(() => {
    resetDrill();
  }, [periodMode, activeMonthKey, resetDrill]);

  const segmentBuckets =
    periodMode === 'monthly' && monthlySummary
      ? {
          weekday: monthlySummary.weekday,
          weekend: monthlySummary.weekend,
        }
      : {
          weekday: weeklySummary.weekday,
          weekend: weeklySummary.weekend,
        };

  const periodBadge =
    periodMode === 'weekly'
      ? `이번 주 · ${weeklySummary.weekLabel}`
      : monthlySummary?.monthLabel ?? '월별';

  const salesFilterContext = useMemo(
    () =>
      buildSalesFilterContext({
        periodMode,
        segment: resolveDrillContextSegment(openDrillSegment, weeklySegment),
        drillLevel,
        weeklySummary,
        monthlySummary,
        monthlyCatalog,
        activeMonthKey,
        selectedWeekLabel,
        weekRows,
        dayRows,
      }),
    [
      activeMonthKey,
      dayRows,
      drillLevel,
      monthlyCatalog,
      monthlySummary,
      periodMode,
      selectedWeekLabel,
      openDrillSegment,
      weekRows,
      weeklySegment,
      weeklySummary,
    ],
  );

  useEffect(() => {
    onSalesFilterContextChange?.(salesFilterContext);
  }, [onSalesFilterContextChange, salesFilterContext]);

  const loadWeekRows = useCallback(
    async (segment: WeeklySalesSegment) => {
      const generation = drillLoadGenerationRef.current + 1;
      drillLoadGenerationRef.current = generation;
      setIsDrillLoading(true);
      setWeekRows([]);

      try {
        const rows = await fetchOrgSegmentWeekRows(scope, segment, {
          periodMode,
          monthKey: periodMode === 'monthly' ? activeMonthKey : undefined,
          storeOrgId,
        });

        if (drillLoadGenerationRef.current !== generation) {
          return;
        }

        setWeekRows(rows);
      } finally {
        if (drillLoadGenerationRef.current === generation) {
          setIsDrillLoading(false);
        }
      }
    },
    [activeMonthKey, periodMode, scope, storeOrgId],
  );

  const loadDayRows = useCallback(
    async (segment: WeeklySalesSegment, weekKey: string) => {
      const generation = drillLoadGenerationRef.current + 1;
      drillLoadGenerationRef.current = generation;
      setIsDrillLoading(true);
      setDayRows([]);

      try {
        const rows = await fetchOrgSegmentDayRows(scope, segment, weekKey, { storeOrgId });

        if (drillLoadGenerationRef.current !== generation) {
          return;
        }

        setDayRows(rows);
      } finally {
        if (drillLoadGenerationRef.current === generation) {
          setIsDrillLoading(false);
        }
      }
    },
    [scope, storeOrgId],
  );

  const handleSegmentPress = useCallback(
    (segment: WeeklySalesSegment) => {
      if (openDrillSegment === segment && drillLevel !== 'summary') {
        resetDrill();
        return;
      }

      drillLoadGenerationRef.current += 1;
      setOpenDrillSegment(segment);
      onWeeklySegmentChange(segment);
      setDrillLevel('weeks');
      setSelectedWeekKey('');
      setSelectedWeekLabel('');
      setDayRows([]);
      setWeekRows([]);
      void loadWeekRows(segment);
    },
    [drillLevel, loadWeekRows, onWeeklySegmentChange, openDrillSegment, resetDrill],
  );

  const handleWeekPress = useCallback(
    (row: SegmentWeekRow) => {
      const segment = resolveDrillContextSegment(openDrillSegment, weeklySegment);

      setSelectedWeekKey(row.weekKey);
      setSelectedWeekLabel(row.weekLabel);
      setDrillLevel('days');
      void loadDayRows(segment, row.weekKey);
    },
    [loadDayRows, openDrillSegment, weeklySegment],
  );

  const handleBackFromWeeks = useCallback(() => {
    resetDrill();
  }, [resetDrill]);

  const handleBackFromDays = useCallback(() => {
    setDrillLevel('weeks');
    setDayRows([]);
    setSelectedWeekKey('');
    setSelectedWeekLabel('');
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.modeRow}>
        {PERIOD_MODES.map(({ key, label }) => {
          const active = periodMode === key;

          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onPeriodModeChange(key)}
              style={({ pressed }) => [
                styles.modeChip,
                active && styles.modeChipActive,
                pressed && styles.modeChipPressed,
              ]}>
              <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {periodMode === 'weekly' && onSelectWeekStart ? (
        <View style={styles.weekPager}>
          <View style={styles.weekNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canGoPrevWeekPage }}
              disabled={!canGoPrevWeekPage}
              onPress={() => setWeekPage((page) => Math.max(0, page - 1))}
              style={({ pressed }) => [
                styles.weekNavButton,
                !canGoPrevWeekPage && styles.weekNavButtonDisabled,
                pressed && canGoPrevWeekPage && styles.weekNavButtonPressed,
              ]}>
              <Text
                style={[
                  styles.weekNavButtonText,
                  !canGoPrevWeekPage && styles.weekNavButtonTextDisabled,
                ]}>
                ‹
              </Text>
            </Pressable>
            <Text style={styles.weekNavIndicator}>
              {Math.max(1, Math.min(weekCatalog.length, selectedWeekIndex + 1))} / {weekCatalog.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canGoNextWeekPage }}
              disabled={!canGoNextWeekPage}
              onPress={() => setWeekPage((page) => Math.min(weekPageCount - 1, page + 1))}
              style={({ pressed }) => [
                styles.weekNavButton,
                !canGoNextWeekPage && styles.weekNavButtonDisabled,
                pressed && canGoNextWeekPage && styles.weekNavButtonPressed,
              ]}>
              <Text
                style={[
                  styles.weekNavButtonText,
                  !canGoNextWeekPage && styles.weekNavButtonTextDisabled,
                ]}>
                ›
              </Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {visibleWeeks.map((week) => {
              const selected = week.weekStart === activeWeekStart;
              return (
                <Pressable
                  key={week.weekStart}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onSelectWeekStart(week.weekStart)}
                  style={({ pressed }) => [
                    styles.weekChip,
                    selected && styles.weekChipSelected,
                    pressed && styles.weekChipPressed,
                  ]}>
                  <Text
                    style={[styles.weekChipLabel, selected && styles.weekChipLabelSelected]}
                    numberOfLines={1}>
                    {week.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <Text style={styles.badge}>{periodBadge}</Text>
      )}

      {periodMode === 'monthly' ? (
        <>
          {onMonthSearchQueryChange ? (
            <TextInput
              onChangeText={onMonthSearchQueryChange}
              placeholder="월 검색 (예: 2026년 5월)"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={monthSearchQuery}
            />
          ) : null}
          {monthlyCatalog.length > 0 && onSelectMonthKey ? (
            <View style={styles.monthPager}>
              <View style={styles.monthRow}>
                {visibleMonths.map((month) => {
                  const selected = month.monthKey === activeMonthKey;

                  return (
                    <Pressable
                      key={month.monthKey}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => onSelectMonthKey(month.monthKey)}
                      style={({ pressed }) => [
                        styles.monthChip,
                        selected && styles.monthChipSelected,
                        pressed && styles.monthChipPressed,
                      ]}>
                      <Text
                        numberOfLines={1}
                        style={[styles.monthChipLabel, selected && styles.monthChipLabelSelected]}>
                        {month.label}
                      </Text>
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        numberOfLines={1}
                        style={[styles.monthChipValue, selected && styles.monthChipValueSelected]}>
                        {formatSalesAmount(month.grossSales)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {monthPageCount > 1 ? (
                <View style={styles.monthNavRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canGoPrevMonthPage }}
                    disabled={!canGoPrevMonthPage}
                    onPress={() => setMonthPage((page) => Math.max(0, page - 1))}
                    style={({ pressed }) => [
                      styles.monthNavButton,
                      !canGoPrevMonthPage && styles.monthNavButtonDisabled,
                      pressed && canGoPrevMonthPage && styles.monthNavButtonPressed,
                    ]}>
                    <Text
                      style={[
                        styles.monthNavButtonText,
                        !canGoPrevMonthPage && styles.monthNavButtonTextDisabled,
                      ]}>
                      이전
                    </Text>
                  </Pressable>
                  <Text style={styles.monthNavIndicator}>
                    {monthPageIndex + 1} / {monthPageCount}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canGoNextMonthPage }}
                    disabled={!canGoNextMonthPage}
                    onPress={() => setMonthPage((page) => Math.min(monthPageCount - 1, page + 1))}
                    style={({ pressed }) => [
                      styles.monthNavButton,
                      !canGoNextMonthPage && styles.monthNavButtonDisabled,
                      pressed && canGoNextMonthPage && styles.monthNavButtonPressed,
                    ]}>
                    <Text
                      style={[
                        styles.monthNavButtonText,
                        !canGoNextMonthPage && styles.monthNavButtonTextDisabled,
                      ]}>
                      다음
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.row}>
        {SEGMENTS.map(({ key, label, hint }) => {
          const bucket = key === 'weekend' ? segmentBuckets.weekend : segmentBuckets.weekday;
          const active = weeklySegment === key;
          const isDrillOpen = openDrillSegment === key && drillLevel !== 'summary';

          return (
            <View key={key} style={styles.cellColumn}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => handleSegmentPress(key)}
                style={({ pressed }) => [styles.cellWrap, pressed && styles.cellPressed]}>
                <View style={[styles.cell, active ? styles.cellActive : styles.cellIdle]}>
                  <Text style={[styles.title, active && styles.titleActive]}>{label}</Text>
                  <Text style={[styles.amount, active && styles.amountActive]}>
                    {formatSalesAmount(bucket.grossSales)}
                  </Text>
                  <Text style={[styles.meta, active && styles.metaActive]}>
                    {hint} · {bucket.treatmentCount}건
                    {isDrillOpen ? ' · 탭하여 접기' : ' · 탭하여 주단위'}
                  </Text>
                </View>
              </Pressable>

              {isDrillOpen && drillLevel === 'weeks' ? (
                <View style={styles.drillPanel}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleBackFromWeeks}
                    style={({ pressed }) => [styles.drillBackRow, pressed && styles.cellPressed]}>
                    <Text style={styles.drillBackText}>← {segmentLabel(key)} · 주단위</Text>
                  </Pressable>
                  {isDrillLoading ? (
                    <ActivityIndicator color="#14B8A6" style={styles.drillLoader} />
                  ) : weekRows.length === 0 ? (
                    <Text style={styles.drillEmpty}>표시할 주간 매출이 없습니다.</Text>
                  ) : (
                    weekRows.map((row) => (
                      <Pressable
                        key={row.weekKey}
                        accessibilityRole="button"
                        onPress={() => handleWeekPress(row)}
                        style={({ pressed }) => [styles.drillRow, pressed && styles.drillRowPressed]}>
                        <View style={styles.drillRowMain}>
                          <Text style={styles.drillRowTitle}>{row.weekLabel}</Text>
                          <Text style={styles.drillRowAmount}>{formatSalesAmount(row.grossSales)}</Text>
                        </View>
                        <Text style={styles.drillRowMeta}>{row.treatmentCount}건 · 탭하여 요일별</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}

              {isDrillOpen && drillLevel === 'days' ? (
                <View style={styles.drillPanel}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleBackFromDays}
                    style={({ pressed }) => [styles.drillBackRow, pressed && styles.cellPressed]}>
                    <Text style={styles.drillBackText}>
                      ← {segmentLabel(key)} · {selectedWeekLabel || selectedWeekKey}
                    </Text>
                  </Pressable>
                  {isDrillLoading ? (
                    <ActivityIndicator color="#14B8A6" style={styles.drillLoader} />
                  ) : dayRows.length === 0 ? (
                    <Text style={styles.drillEmpty}>표시할 요일별 매출이 없습니다.</Text>
                  ) : (
                    dayRows.map((row) => (
                      <View key={row.date} style={styles.drillRow}>
                        <View style={styles.drillRowMain}>
                          <Text style={styles.drillRowTitle}>{row.label}</Text>
                          <Text style={styles.drillRowAmount}>{formatSalesAmount(row.grossSales)}</Text>
                        </View>
                        <Text style={styles.drillRowMeta}>{row.treatmentCount}건</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modeChipActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#14B8A6',
  },
  modeChipPressed: {
    opacity: 0.92,
  },
  modeChipText: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '800',
  },
  modeChipTextActive: {
    color: '#0F766E',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    borderRadius: 999,
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weekPager: {
    gap: 8,
  },
  weekNavRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  weekNavButton: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  weekNavButtonDisabled: {
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
  },
  weekNavButtonPressed: {
    opacity: 0.92,
  },
  weekNavButtonText: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  weekNavButtonTextDisabled: {
    color: '#9CA3AF',
  },
  weekNavIndicator: {
    color: '#6B6B7B',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weekChip: {
    backgroundColor: '#F7FDFC',
    borderColor: '#B2F5EA',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  weekChipSelected: {
    backgroundColor: '#CCFBF1',
    borderColor: '#14B8A6',
  },
  weekChipPressed: {
    opacity: 0.92,
  },
  weekChipLabel: {
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  weekChipLabelSelected: {
    color: '#0F766E',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#B2F5EA',
    borderRadius: 12,
    borderWidth: 1,
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthPager: {
    gap: 8,
  },
  monthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  monthChip: {
    backgroundColor: '#F7FDFC',
    borderColor: '#B2F5EA',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  monthNavRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthNavButton: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  monthNavButtonDisabled: {
    backgroundColor: '#F7F7FA',
    borderColor: '#E8E8F0',
  },
  monthNavButtonPressed: {
    opacity: 0.92,
  },
  monthNavButtonText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  monthNavButtonTextDisabled: {
    color: '#9CA3AF',
  },
  monthNavIndicator: {
    color: '#6B6B7B',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  monthChipSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
  },
  monthChipPressed: {
    opacity: 0.92,
  },
  monthChipLabel: {
    color: '#5EEAD4',
    fontSize: 11,
    fontWeight: '700',
  },
  monthChipLabelSelected: {
    color: '#0F766E',
  },
  monthChipValue: {
    color: '#99F6E4',
    fontSize: 13,
    fontWeight: '900',
  },
  monthChipValueSelected: {
    color: '#0F766E',
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  cellColumn: {
    flex: 1,
    gap: 8,
  },
  cellWrap: {
    width: '100%',
  },
  cell: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    minHeight: 88,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cellIdle: {
    backgroundColor: '#F7FDFC',
    borderColor: '#B2F5EA',
  },
  cellActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
  },
  cellPressed: {
    opacity: 0.92,
  },
  title: {
    color: '#5EEAD4',
    fontSize: 14,
    fontWeight: '900',
  },
  titleActive: {
    color: '#134E4A',
  },
  amount: {
    color: '#99F6E4',
    fontSize: 16,
    fontWeight: '900',
  },
  amountActive: {
    color: '#0F766E',
  },
  meta: {
    color: '#99F6E4',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  metaActive: {
    color: '#0F766E',
  },
  drillPanel: {
    backgroundColor: '#F7FDFC',
    borderColor: '#B2F5EA',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  drillBackRow: {
    paddingVertical: 4,
  },
  drillBackText: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
  },
  drillLoader: {
    paddingVertical: 12,
  },
  drillEmpty: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 8,
    textAlign: 'center',
  },
  drillRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8F0',
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  drillRowPressed: {
    opacity: 0.92,
  },
  drillRowMain: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  drillRowTitle: {
    color: '#134E4A',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  drillRowAmount: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '900',
  },
  drillRowMeta: {
    color: '#6B6B7B',
    fontSize: 10,
    fontWeight: '600',
  },
});
