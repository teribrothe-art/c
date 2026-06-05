/** 테스트 로그인·디자이너 타일용 경량 매장 메타 (org-store-affiliation import 없음) */
export type DemoLoginStoreMeta = {
  name: string;
  region: string;
  hotPlace: string;
  /** UI 표시용 디자이너 수 */
  designerCount: number;
};

export const DEMO_LOGIN_STORE_META: Record<string, DemoLoginStoreMeta> = {
  'virtual-store-hot-gangnam': {
    name: '강남 플랜비',
    region: '서울 강남',
    hotPlace: '역삼·청담·압구정 상권',
    designerCount: 8,
  },
  'virtual-store-hot-hongdae': {
    name: '홍대·연남 플랜비',
    region: '서울 마포',
    hotPlace: '홍익대·연남동·망원 상권',
    designerCount: 7,
  },
  'virtual-store-hot-seongsu': {
    name: '성수 플랜비',
    region: '서울 성동',
    hotPlace: '성수·뚝섬 카페·살롱 거리',
    designerCount: 7,
  },
  'virtual-store-hot-busan': {
    name: '해운대·광안리 플랜비',
    region: '부산 해운대',
    hotPlace: '해운대·광안리·센텀',
    designerCount: 8,
  },
};

const DESIGNER_STORE_LABELS: Record<string, string> = {
  'demo-designer-local': '강남 플랜비 · 역삼·청담·압구정 상권',
  'beta-designer-01': '강남 플랜비 · 역삼·청담·압구정 상권',
  'beta-designer-02': '강남 플랜비 · 역삼·청담·압구정 상권',
  'beta-designer-03': '홍대·연남 플랜비 · 홍익대·연남동·망원 상권',
  'beta-designer-04': '홍대·연남 플랜비 · 홍익대·연남동·망원 상권',
  'beta-designer-05': '성수 플랜비 · 성수·뚝섬 카페·살롱 거리',
  'test-designer-1y': '성수 플랜비 · 성수·뚝섬 카페·살롱 거리',
  'test-designer-3y': '해운대·광안리 플랜비 · 해운대·광안리·센텀',
  'test-designer-accum-3y': '해운대·광안리 플랜비 · 해운대·광안리·센텀',
  'test-designer-accum-5y': '해운대·광안리 플랜비 · 해운대·광안리·센텀',
};

export function formatDemoLoginStoreLabel(storeId: string) {
  const meta = DEMO_LOGIN_STORE_META[storeId];

  if (!meta) {
    return '매장 미연결';
  }

  return `${meta.name} · ${meta.hotPlace}`;
}

export function formatLiteDesignerStoreLabel(designerId: string, fleetStoreId?: string) {
  const preset = DESIGNER_STORE_LABELS[designerId];

  if (preset) {
    return preset;
  }

  if (fleetStoreId) {
    return formatDemoLoginStoreLabel(fleetStoreId);
  }

  return '매장 미연결';
}
