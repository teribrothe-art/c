import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  isRecommendedScalpProduct,
  recommendedScalpProductsForType,
  SCALP_PRODUCT_GROUPS,
} from '../../lib/scalp-product-presets';
import { formatProductsInput, parseProductsInput } from '../../lib/treatment-options';
import { colors, formTextInputStyle } from '../../lib/theme';

type ScalpProductPickerProps = {
  treatmentType: string;
  value: string;
  onChange: (formatted: string) => void;
  maxHeight?: number;
};

function toggleProduct(selected: string[], product: string) {
  if (selected.includes(product)) {
    return selected.filter((item) => item !== product);
  }

  return [...selected, product];
}

export function ScalpProductPicker({
  treatmentType,
  value,
  onChange,
  maxHeight = 220,
}: ScalpProductPickerProps) {
  const selected = parseProductsInput(value);
  const recommended = recommendedScalpProductsForType(treatmentType);

  const applySelection = (next: string[]) => {
    onChange(formatProductsInput(next));
  };

  const toggle = (product: string) => {
    applySelection(toggleProduct(selected, product));
  };

  const applyRecommended = () => {
    const merged = [...selected];

    for (const item of recommended) {
      if (!merged.includes(item)) {
        merged.push(item);
      }
    }

    applySelection(merged);
  };

  return (
    <View style={styles.wrap}>
      {recommended.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={applyRecommended}
          style={({ pressed }) => [styles.recommendButton, pressed && styles.chipPressed]}>
          <Text style={styles.recommendButtonText}>
            {treatmentType} 추천 제품 한번에 선택 ({recommended.length}개)
          </Text>
        </Pressable>
      ) : null}

      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={[styles.scroll, { maxHeight }]}>
        {SCALP_PRODUCT_GROUPS.map((group) => (
          <View key={group.id} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Text style={styles.groupSubtitle}>{group.subtitle}</Text>
            <View style={styles.chipRow}>
              {group.items.map((item) => {
                const picked = selected.includes(item);
                const isRecommended = isRecommendedScalpProduct(treatmentType, item);

                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: picked }}
                    onPress={() => toggle(item)}
                    style={({ pressed }) => [
                      styles.chip,
                      picked && styles.chipSelected,
                      isRecommended && !picked && styles.chipRecommended,
                      pressed && styles.chipPressed,
                    ]}>
                    <Text style={[styles.chipText, picked && styles.chipTextSelected]}>
                      {isRecommended ? '★ ' : ''}
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <TextInput
        multiline
        keyboardAppearance="light"
        onChangeText={onChange}
        placeholder="직접 입력 (쉼표·줄바꿈으로 구분)"
        placeholderTextColor="#9CA3AF"
        style={[styles.customInput, formTextInputStyle]}
        textAlignVertical="top"
        value={value}
      />
      {selected.length > 0 ? (
        <Text style={styles.summary}>선택 {selected.length}개 · {formatProductsInput(selected)}</Text>
      ) : (
        <Text style={styles.summaryMuted}>두피·모발에 필요한 제품을 선택하세요 (선택 사항)</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  recommendButton: {
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    borderColor: colors.purple,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recommendButtonText: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '800',
  },
  scroll: {
    flexGrow: 0,
  },
  group: {
    gap: 6,
    marginBottom: 12,
  },
  groupTitle: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: '800',
  },
  groupSubtitle: {
    color: '#6B6B7B',
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F3F3F6',
    borderColor: '#E3E3EA',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.lightMint,
    borderColor: colors.mint,
  },
  chipRecommended: {
    borderColor: '#D4C4FF',
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: colors.mint,
    fontWeight: '900',
  },
  customInput: {
    borderColor: '#E8E8F0',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    maxHeight: 72,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summary: {
    color: '#1A1A2E',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  summaryMuted: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
});
