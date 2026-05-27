import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Treatment } from './treatment-types';
import { isAccumulatedTestTreatmentId } from './demo-accumulated-ids';

const PATCHES_KEY = 'hair-diary-accumulated-treatment-patches';

export type AccumulatedTreatmentPatch = Partial<
  Pick<
    Treatment,
    | 'technique'
    | 'designer_diagnosis'
    | 'home_care'
    | 'products'
    | 'damage_level'
    | 'duration'
    | 'treatment_type'
    | 'treatment_title'
    | 'price'
    | 'ai_insight'
    | 'before_photo_url'
    | 'after_photo_url'
    | 'feedback_completed'
    | 'payment_status'
  >
>;

let patchesCache: Record<string, AccumulatedTreatmentPatch> | null = null;
let patchesPromise: Promise<Record<string, AccumulatedTreatmentPatch>> | null = null;

async function readPatches(): Promise<Record<string, AccumulatedTreatmentPatch>> {
  if (patchesCache) {
    return patchesCache;
  }

  if (!patchesPromise) {
    patchesPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(PATCHES_KEY);

        if (!raw) {
          patchesCache = {};
          return patchesCache;
        }

        const parsed = JSON.parse(raw) as Record<string, AccumulatedTreatmentPatch>;
        patchesCache = parsed && typeof parsed === 'object' ? parsed : {};
        return patchesCache;
      } catch {
        patchesCache = {};
        return patchesCache;
      } finally {
        patchesPromise = null;
      }
    })();
  }

  return patchesPromise;
}

async function writePatches(next: Record<string, AccumulatedTreatmentPatch>) {
  patchesCache = next;
  await AsyncStorage.setItem(PATCHES_KEY, JSON.stringify(next));
}

export async function getAccumulatedTreatmentPatch(
  treatmentId: string,
): Promise<AccumulatedTreatmentPatch | null> {
  if (!isAccumulatedTestTreatmentId(treatmentId)) {
    return null;
  }

  const patches = await readPatches();
  return patches[treatmentId] ?? null;
}

export function applyAccumulatedTreatmentPatch<T extends Treatment>(treatment: T): T {
  if (!isAccumulatedTestTreatmentId(treatment.id) || !patchesCache) {
    return treatment;
  }

  const patch = patchesCache[treatment.id];

  if (!patch) {
    return treatment;
  }

  return { ...treatment, ...patch };
}

export async function applyAccumulatedTreatmentPatchAsync<T extends Treatment>(
  treatment: T,
): Promise<T> {
  if (!isAccumulatedTestTreatmentId(treatment.id)) {
    return treatment;
  }

  await readPatches();
  return applyAccumulatedTreatmentPatch(treatment);
}

export async function mergeAccumulatedTreatmentPatch(
  treatmentId: string,
  patch: AccumulatedTreatmentPatch,
): Promise<AccumulatedTreatmentPatch> {
  if (!isAccumulatedTestTreatmentId(treatmentId)) {
    return patch;
  }

  const patches = await readPatches();
  const merged = { ...(patches[treatmentId] ?? {}), ...patch };
  const next = { ...patches, [treatmentId]: merged };
  await writePatches(next);

  return merged;
}

export async function ensureAccumulatedTreatmentPatchesLoaded() {
  await readPatches();
}

/** 메모리 시드 배열에 저장된 누적 테스트 시술 패치 반영 */
export function reapplyAccumulatedTreatmentPatchesInStore(demoTreatments: Treatment[]) {
  if (!patchesCache) {
    return;
  }

  for (let index = 0; index < demoTreatments.length; index += 1) {
    const item = demoTreatments[index];

    if (!isAccumulatedTestTreatmentId(item.id)) {
      continue;
    }

    const patch = patchesCache[item.id];

    if (patch) {
      demoTreatments[index] = { ...item, ...patch };
    }
  }
}
