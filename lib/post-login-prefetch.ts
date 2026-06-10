import type { AuthUser } from './auth';
import { prefetchDemoWorkspaceStorage } from './demo-async-storage';

/** 로그인 직후 화면 로딩을 줄이기 위해 백그라운드 워밍 (await 하지 않음) */
export function prefetchPostLoginWorkspace(user: AuthUser) {
  void prefetchDemoWorkspaceStorage().then(() => {
    if (user.role === 'designer') {
      void warmupDesignerWorkspace(user.id);
      return;
    }

    if (user.role === 'store' || user.role === 'admin') {
      void import('./org-aggregates').then((module) =>
        module.fetchOrgDashboardSummary(user.role === 'admin' ? 'admin' : 'store'),
      );
    }

    if (user.role === 'customer') {
      void warmupCustomerWorkspace(user.id);
    }
  });
}

async function warmupDesignerWorkspace(designerId: string) {
  const designerUser = { id: designerId, role: 'designer' as const };

  const [{ fetchDesignerPaymentDashboard }, { getDesignerClientListItems }, hydrate, seeds] =
    await Promise.all([
      import('./designer-payment-stats'),
      import('./customer-invitations'),
      import('./demo-accumulated-demo-hydrate'),
      import('./demo-accumulated-test-seeds'),
    ]);

  if (hydrate.shouldHydrateAccumulatedDemoDataForUser(designerUser)) {
    seeds.ensureAccumulatedProfileBuiltByDesignerId(designerId);
  }

  await Promise.all([
    fetchDesignerPaymentDashboard(),
    getDesignerClientListItems(),
    import('./designer-booking').then((module) => module.getDesignerReservationItems()),
  ]);
}

async function warmupCustomerWorkspace(_customerId: string) {
  const { getTreatments } = await import('./treatments');
  void getTreatments();
}
