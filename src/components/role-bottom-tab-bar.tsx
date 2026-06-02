import type { UserRole } from '../../lib/auth';
import { AdminBottomTabBar } from './admin-bottom-tab-bar';
import { BottomTabBar } from './bottom-tab-bar';
import { DesignerBottomTabBar } from './designer-bottom-tab-bar';
import { StoreBottomTabBar } from './store-bottom-tab-bar';

/** 하단 탭 바 높이 + 여백 (스크롤 paddingBottom) */
export const TAB_BAR_BOTTOM_INSET = 100;

export function RoleBottomTabBar({ role }: { role?: UserRole | null }) {
  if (role === 'designer') {
    return <DesignerBottomTabBar />;
  }

  if (role === 'store') {
    return <StoreBottomTabBar />;
  }

  if (role === 'admin') {
    return <AdminBottomTabBar />;
  }

  return <BottomTabBar />;
}

export function OrgScopeTabBar({ scope }: { scope: 'store' | 'admin' }) {
  return scope === 'store' ? <StoreBottomTabBar /> : <AdminBottomTabBar />;
}
