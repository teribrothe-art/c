import { clearAccumulatedDemoHydrateCache } from './demo-accumulated-demo-hydrate';
import { invalidateDesignerWorkspaceCache } from './designer-workspace-cache';
import { stripAccumulatedRelationshipsFromStorage } from './demo-accumulated-relationships';
import { clearAccumulatedTestProfilesCache } from './demo-accumulated-test-seeds';
import { clearAccumulatedTreatmentPatchesStorage } from './demo-accumulated-treatment-patches';
import { purgeAccumulatedFromDemoPaymentStore } from './payment-record';
import { purgeAccumulatedFromDemoTreatmentStore } from './treatments';

export type ClearAccumulatedDemoCacheResult = {
  removedTreatments: number;
  removedPayments: number;
  removedRelationships: number;
};

/** 누적 테스트 시드·패치·관계 캐시 전체 삭제 (데모 모드) */
export async function clearAccumulatedDemoCache(): Promise<ClearAccumulatedDemoCacheResult> {
  await clearAccumulatedTreatmentPatchesStorage();

  const [removedTreatments, removedPayments, removedRelationships] = await Promise.all([
    purgeAccumulatedFromDemoTreatmentStore(),
    purgeAccumulatedFromDemoPaymentStore(),
    stripAccumulatedRelationshipsFromStorage(),
  ]);

  clearAccumulatedTestProfilesCache();
  clearAccumulatedDemoHydrateCache();
  invalidateDesignerWorkspaceCache();

  return {
    removedTreatments,
    removedPayments,
    removedRelationships,
  };
}
