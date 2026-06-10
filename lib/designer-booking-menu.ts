import { getCurrentUser, isDemoAuthMode } from './auth';
import { demoGetItem, demoSetItem } from './demo-async-storage';
import { toAppError } from './errors';
import { DEFAULT_TREATMENT_DURATION, TREATMENT_TYPE_OPTIONS } from './treatment-options';
import { supabase } from './supabase';

export type DesignerBookingMenuItem = {
  id: string;
  name: string;
  duration: string;
  enabled: boolean;
};

export type DesignerBookingMenuCategory = {
  id: string;
  category: string;
  icon: string;
  enabled: boolean;
  items: DesignerBookingMenuItem[];
};

export type DesignerBookingMenuConfig = {
  designerId: string;
  categories: DesignerBookingMenuCategory[];
  updatedAt: string;
};

export type DesignerBookingMenuSelection = {
  category: string;
  itemId: string;
  itemName: string;
  duration: string;
};

const STORAGE_KEY = 'hair-diary-designer-booking-menus';

const DEFAULT_MENU_NAMES: Record<string, string[]> = {
  컷: ['일반 컷', '레이어드 컷', '앞머리 컷'],
  컬러: ['풀 컬러', '뿌리 염색', '톤 다운'],
  펌: ['일반펌', '열펌', '볼륨펌', '디지털펌'],
  탈색: ['탈색', '브리칭', '탈색 + 토닝'],
  트리트먼트: ['단백질 트리트먼트', '케라틴 케어', '두피 케어'],
  매직: ['매직', '셋팅 펌', '스트레이트'],
  스파: ['헤드 스파', '두피 스파', '아로마 스파'],
};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function createMenuItem(name: string, category: string): DesignerBookingMenuItem {
  return {
    id: `${slugify(category)}-${slugify(name)}`,
    name,
    duration: DEFAULT_TREATMENT_DURATION,
    enabled: true,
  };
}

export function createDefaultDesignerBookingMenu(designerId: string): DesignerBookingMenuConfig {
  return {
    designerId,
    updatedAt: new Date().toISOString(),
    categories: TREATMENT_TYPE_OPTIONS.map((option) => ({
      id: slugify(option.label),
      category: option.label,
      icon: option.icon,
      enabled: true,
      items: (DEFAULT_MENU_NAMES[option.label] ?? [`${option.label} 기본`]).map((name) =>
        createMenuItem(name, option.label),
      ),
    })),
  };
}

function normalizeMenuItem(
  item: Partial<DesignerBookingMenuItem>,
  category: string,
  index: number,
): DesignerBookingMenuItem {
  const name = item.name?.trim() || `${category} 메뉴 ${index + 1}`;

  return {
    id: item.id?.trim() || `${slugify(category)}-${slugify(name)}-${index}`,
    name,
    duration: item.duration?.trim() || DEFAULT_TREATMENT_DURATION,
    enabled: item.enabled !== false,
  };
}

function normalizeCategory(
  category: Partial<DesignerBookingMenuCategory>,
  fallback: DesignerBookingMenuCategory,
): DesignerBookingMenuCategory {
  const label = category.category?.trim() || fallback.category;

  return {
    id: category.id?.trim() || fallback.id,
    category: label,
    icon: category.icon?.trim() || fallback.icon,
    enabled: category.enabled !== false,
    items:
      category.items && category.items.length > 0
        ? category.items.map((item, index) => normalizeMenuItem(item, label, index))
        : fallback.items,
  };
}

export function normalizeDesignerBookingMenu(
  designerId: string,
  raw: Partial<DesignerBookingMenuConfig> | null | undefined,
): DesignerBookingMenuConfig {
  const defaults = createDefaultDesignerBookingMenu(designerId);
  const categories = defaults.categories.map((fallback) => {
    const match = raw?.categories?.find(
      (item) => item.category === fallback.category || item.id === fallback.id,
    );

    return normalizeCategory(match ?? {}, fallback);
  });

  return {
    designerId,
    categories,
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  };
}

async function readAllMenus(): Promise<Record<string, DesignerBookingMenuConfig>> {
  const raw = await demoGetItem(STORAGE_KEY);

  if (!raw) {
    return {};
  }

  return JSON.parse(raw) as Record<string, DesignerBookingMenuConfig>;
}

async function writeAllMenus(items: Record<string, DesignerBookingMenuConfig>) {
  await demoSetItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getDesignerBookingMenu(designerId: string): Promise<DesignerBookingMenuConfig> {
  if (isDemoAuthMode || !supabase) {
    const all = await readAllMenus();
    return normalizeDesignerBookingMenu(designerId, all[designerId]);
  }

  const { data, error } = await supabase
    .from('designer_booking_menus')
    .select('designer_id, categories, updated_at')
    .eq('designer_id', designerId)
    .maybeSingle();

  if (error) {
    if (error.message.includes('Could not find the table') || error.message.includes('relation')) {
      const all = await readAllMenus();
      return normalizeDesignerBookingMenu(designerId, all[designerId]);
    }

    throw toAppError(error);
  }

  if (!data) {
    return createDefaultDesignerBookingMenu(designerId);
  }

  return normalizeDesignerBookingMenu(designerId, {
    designerId: data.designer_id as string,
    categories: (data.categories ?? []) as DesignerBookingMenuCategory[],
    updatedAt: String(data.updated_at ?? new Date().toISOString()),
  });
}

export async function saveDesignerBookingMenu(config: DesignerBookingMenuConfig) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer' || user.id !== config.designerId) {
    throw new Error('본인 예약 메뉴만 수정할 수 있습니다.');
  }

  const normalized = normalizeDesignerBookingMenu(config.designerId, {
    ...config,
    updatedAt: new Date().toISOString(),
  });

  if (isDemoAuthMode || !supabase) {
    const all = await readAllMenus();
    all[normalized.designerId] = normalized;
    await writeAllMenus(all);
    return normalized;
  }

  const { error } = await supabase.from('designer_booking_menus').upsert(
    {
      designer_id: normalized.designerId,
      categories: normalized.categories,
      updated_at: normalized.updatedAt,
    },
    { onConflict: 'designer_id' },
  );

  if (error) {
    if (error.message.includes('Could not find the table') || error.message.includes('relation')) {
      const all = await readAllMenus();
      all[normalized.designerId] = normalized;
      await writeAllMenus(all);
      return normalized;
    }

    throw toAppError(error);
  }

  return normalized;
}

export function listEnabledBookingCategories(config: DesignerBookingMenuConfig) {
  return config.categories.filter(
    (category) => category.enabled && category.items.some((item) => item.enabled),
  );
}

export function listEnabledBookingMenuItems(
  config: DesignerBookingMenuConfig,
  categoryLabel: string,
) {
  const category = config.categories.find((item) => item.category === categoryLabel);

  if (!category || !category.enabled) {
    return [];
  }

  return category.items.filter((item) => item.enabled);
}

export function resolveBookingMenuSelection(
  config: DesignerBookingMenuConfig,
  categoryLabel: string,
  itemId: string,
): DesignerBookingMenuSelection | null {
  const item = listEnabledBookingMenuItems(config, categoryLabel).find(
    (entry) => entry.id === itemId,
  );

  if (!item) {
    return null;
  }

  return {
    category: categoryLabel,
    itemId: item.id,
    itemName: item.name,
    duration: item.duration,
  };
}

export function formatBookingMenuLabel(selection: DesignerBookingMenuSelection) {
  return `${selection.category} · ${selection.itemName}`;
}
