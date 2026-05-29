import { useCallback, useMemo, useState } from 'react';

import { isDemoAuthMode } from './auth';
import type { OrgScope } from './org-access';
import { fetchOrgDashboardSummary, type OrgDashboardSummary } from './org-aggregates';
import { resolveCurrentStoreOrgId } from './org-store-scope';
import {
  applyVirtualSimulationToSummary,
  filterSummaryForStoreScope,
  type VirtualSimulationScenario,
} from './org-virtual-simulation';

type Options = {
  storeOrgId?: string;
};

export function useOrgDashboardScenario(scope: OrgScope, options?: Options) {
  const [scenario, setScenario] = useState<VirtualSimulationScenario>('weekday');
  const [baseSummary, setBaseSummary] = useState<OrgDashboardSummary | null>(null);
  const [resolvedStoreOrgId, setResolvedStoreOrgId] = useState<string | undefined>(options?.storeOrgId);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);

    const storeOrgPromise =
      scope === 'store' && !options?.storeOrgId
        ? resolveCurrentStoreOrgId()
        : Promise.resolve(options?.storeOrgId);

    storeOrgPromise
      .then((storeOrgId) => {
        setResolvedStoreOrgId(storeOrgId);

        return fetchOrgDashboardSummary(scope, {
          withVirtualSimulation: false,
          storeOrgId,
        });
      })
      .then((data) => {
        setBaseSummary(data);
        setErrorMessage('');
      })
      .catch((error) => {
        setBaseSummary(null);
        setErrorMessage(error instanceof Error ? error.message : '현황을 불러오지 못했습니다.');
      })
      .finally(() => setIsLoading(false));
  }, [options?.storeOrgId, scope]);

  const summary = useMemo(() => {
    if (!baseSummary) {
      return null;
    }

    const filtered = filterSummaryForStoreScope(baseSummary, scope, resolvedStoreOrgId);

    if (!isDemoAuthMode) {
      return filtered;
    }

    return applyVirtualSimulationToSummary(filtered, scenario);
  }, [baseSummary, resolvedStoreOrgId, scenario, scope]);

  return {
    scenario,
    setScenario,
    summary,
    isLoading,
    errorMessage,
    reload: load,
  };
}
