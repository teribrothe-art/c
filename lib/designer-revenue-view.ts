import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { supabase } from './supabase';

export type DesignerRevenueRow = {
  designer_id: string;
  month: string;
  treatment_count: number;
  gross_revenue: number;
  total_fees: number;
  net_payout: number;
};

/** `designer_revenue` 뷰 — status=completed, 월별 집계 */
export async function fetchDesignerRevenueByMonth(limit = 12) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'designer') {
    return [] as DesignerRevenueRow[];
  }

  if (isDemoAuthMode || !supabase) {
    return [] as DesignerRevenueRow[];
  }

  const { data, error } = await supabase
    .from('designer_revenue')
    .select('designer_id, month, treatment_count, gross_revenue, total_fees, net_payout')
    .eq('designer_id', user.id)
    .order('month', { ascending: false })
    .limit(limit);

  if (error) {
    throw toAppError(error);
  }

  return (data ?? []) as DesignerRevenueRow[];
}
