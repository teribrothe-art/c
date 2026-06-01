import type { DemoLoginAccount } from './demo-login-accounts';

/** 테스트 로그인 목록 — 한 번에 표시할 계정 수 */
export const DEMO_LOGIN_PAGE_SIZE = 40;

export type DesignerListStageTab = '데모·베타' | '누적' | '전국' | '전체보기';

export const DESIGNER_LIST_STAGE_TABS: readonly DesignerListStageTab[] = [
  '데모·베타',
  '누적',
  '전국',
  '전체보기',
] as const;

export type CustomerListViewTab = '전체보기';

export function filterDesignersByStage(
  accounts: DemoLoginAccount[],
  stage: DesignerListStageTab,
): DemoLoginAccount[] {
  switch (stage) {
    case '데모·베타':
      return accounts.filter((account) => account.roleLabel === '데모' || account.roleLabel === '베타');
    case '누적':
      return accounts.filter((account) => account.roleLabel === '누적' || account.roleLabel === '증원');
    case '전국':
      return accounts.filter((account) => account.id.startsWith('test-designer-nw-'));
    case '전체보기':
      return accounts;
    default:
      return accounts;
  }
}

export function paginateList<T>(items: T[], page: number, pageSize = DEMO_LOGIN_PAGE_SIZE) {
  const total = items.length;
  const safePage = Math.max(0, page);
  const start = safePage * pageSize;
  const slice = items.slice(start, start + pageSize);

  return {
    slice,
    total,
    page: safePage,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    hasMore: start + pageSize < total,
    rangeLabel:
      total === 0
        ? '0명'
        : `${start + 1}–${Math.min(start + pageSize, total)} / ${total.toLocaleString('ko-KR')}명`,
  };
}
