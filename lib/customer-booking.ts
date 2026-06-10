import { getCurrentUser } from './auth';
import { getAdminDesignerRoster, type OrgDesignerRosterEntry } from './org-designer-roster';
import {
  getDesignerStoreAffiliation,
  getOrgStoreById,
  ORG_STORE_DEFINITIONS,
  type OrgStore,
} from './org-store-affiliation';
import { ensureDesignerCustomerRelationship } from './registered-customers';
import { invalidateDesignerWorkspaceCache } from './designer-workspace-cache';
import { addNotification } from './notifications';
import { TREATMENT_TYPE_OPTIONS } from './treatment-options';
import {
  listTreatmentsForDesignerId,
  type Treatment,
} from './treatments';

export type BookingTimeSlot = {
  key: string;
  label: string;
  hour: number;
};

export type BookableDesignerProfile = {
  id: string;
  name: string;
  subtitle?: string;
  storeId: string;
  storeName: string;
  storeRegion: string;
  hotPlace: string;
  specialtyTypes: string[];
  recentTitles: string[];
  treatmentCount: number;
};

export type DesignerMatchResult = BookableDesignerProfile & {
  matchScore: number;
  matchReason: string;
  isOtherRegion: boolean;
};

const SLOT_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const rosterById = () => new Map(getAdminDesignerRoster().map((entry) => [entry.id, entry]));

export function listBookableStores(): OrgStore[] {
  return ORG_STORE_DEFINITIONS.filter((store) => store.designerIds.length > 0);
}

export function listDesignersForStore(storeId: string): OrgDesignerRosterEntry[] {
  const store = getOrgStoreById(storeId);

  if (!store) {
    return [];
  }

  const roster = rosterById();

  return store.designerIds
    .map((designerId) => roster.get(designerId))
    .filter((entry): entry is OrgDesignerRosterEntry => Boolean(entry));
}

function hashSeed(value: string) {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }

  return hash;
}

export function listBookingDates(dayCount = 14) {
  const dates: { key: string; label: string; weekday: string }[] = [];
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let index = 0; index < dayCount; index += 1) {
    const key = cursor.toISOString().slice(0, 10);
    const month = cursor.getMonth() + 1;
    const day = cursor.getDate();

    dates.push({
      key,
      label: `${month}.${String(day).padStart(2, '0')}`,
      weekday: weekdays[cursor.getDay()] ?? '',
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function listAvailableBookingSlots(designerId: string, dateKey: string): BookingTimeSlot[] {
  const seed = hashSeed(`${designerId}:${dateKey}`);
  const bookedHours = new Set<number>();

  for (let index = 0; index < 4; index += 1) {
    bookedHours.add(SLOT_HOURS[(seed + index * 3) % SLOT_HOURS.length]!);
  }

  return SLOT_HOURS.filter((hour) => !bookedHours.has(hour)).map((hour) => ({
    key: `${dateKey}-${hour}`,
    label: `${String(hour).padStart(2, '0')}:00`,
    hour,
  }));
}

function summarizeDesignerTreatments(treatments: Treatment[]) {
  const typeCounts = new Map<string, number>();

  for (const treatment of treatments) {
    const type = treatment.treatment_type?.trim();

    if (!type) {
      continue;
    }

    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  const specialtyTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  const recentTitles: string[] = [];

  for (const treatment of treatments.slice(0, 8)) {
    const title = treatment.treatment_title?.trim();

    if (!title || recentTitles.includes(title)) {
      continue;
    }

    recentTitles.push(title);

    if (recentTitles.length >= 5) {
      break;
    }
  }

  return {
    specialtyTypes,
    recentTitles,
    treatmentCount: treatments.length,
  };
}

export async function loadBookableDesignerProfile(
  designer: OrgDesignerRosterEntry,
): Promise<BookableDesignerProfile> {
  const store = getOrgStoreById(designer.storeId);
  const treatments = await listTreatmentsForDesignerId(designer.id);
  const summary = summarizeDesignerTreatments(treatments);

  return {
    id: designer.id,
    name: designer.name,
    subtitle: designer.subtitle,
    storeId: designer.storeId,
    storeName: designer.storeName,
    storeRegion: store?.region ?? designer.storeRegion,
    hotPlace: store?.hotPlace ?? designer.storeRegion,
    ...summary,
  };
}

export function inferCustomerHomeStoreIds(treatments: Treatment[]) {
  const storeIds = new Set<string>();

  for (const treatment of treatments) {
    if (!treatment.designer_id) {
      continue;
    }

    const affiliation = getDesignerStoreAffiliation(treatment.designer_id);

    if (affiliation) {
      storeIds.add(affiliation.store.id);
    }
  }

  return storeIds;
}

export type CreateCustomerBookingInput = {
  designerId: string;
  designerName: string;
  dateKey: string;
  slot: BookingTimeSlot;
  treatmentType: string;
  treatmentTitle: string;
  duration?: string;
};

export async function createCustomerBooking(input: CreateCustomerBookingInput): Promise<Treatment> {
  const user = await getCurrentUser();

  if (!user || user.role !== 'customer') {
    throw new Error('고객만 예약할 수 있습니다.');
  }

  const treatmentType = input.treatmentType.trim();
  const treatmentTitle = input.treatmentTitle.trim();

  if (!treatmentType) {
    throw new Error('시술 종류를 선택해주세요.');
  }

  if (!treatmentTitle) {
    throw new Error('예약 메뉴를 선택해주세요.');
  }

  const customerName = user.email.split('@')[0] || '고객';

  await ensureDesignerCustomerRelationship(input.designerId, user.id);

  const { createCustomerBookingTreatment } = await import('./customer-booking-create');

  const treatment = await createCustomerBookingTreatment({
    customerId: user.id,
    customerName,
    designerId: input.designerId,
    designerName: input.designerName,
    treatmentDate: input.dateKey,
    treatmentType,
    treatmentTitle,
    bookingTimeLabel: input.slot.label,
    duration: input.duration,
  });

  await addNotification({
    user_id: input.designerId,
    type: 'treatment_recorded',
    title: '고객 예약',
    message: `${customerName}님 · ${input.dateKey.replaceAll('-', '.')} ${input.slot.label} · ${treatmentTitle}`,
    treatment_id: treatment.id,
    href: '/designer/reservations',
  });

  invalidateDesignerWorkspaceCache();

  return treatment;
}

export { TREATMENT_TYPE_OPTIONS };
