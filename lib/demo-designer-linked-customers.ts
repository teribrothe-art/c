import { DEMO_LOGIN_HINT } from './auth';
import { SEO_JUNGHYUN_TEST_ACCOUNT } from './demo-customer-seo-junghyun';
import { type BetaTestAccount } from './beta-test-accounts';
import { getAccumulatedProfileCustomerCount, resolveAccumulatedProfileCustomers } from './demo-accumulated-profile-customers';
import { ACCUMULATED_TEST_PASSWORD, ACCUMULATED_TEST_PROFILE_CONFIGS } from './demo-accumulated-test-accounts';
import { isBetaProfileKey } from './demo-beta-designer-profiles';
import { isDemoDesignerIncludedInTestAccounts } from './demo-designer-customer-counts';

export type DesignerLinkedCustomerSource = {
  profileLabel: string;
  designerName: string;
  designerId: string;
  customerCount: number;
  password: string;
};

function getAccumulatedProfileCustomerSources(): DesignerLinkedCustomerSource[] {
  return ACCUMULATED_TEST_PROFILE_CONFIGS.filter((config) =>
    isDemoDesignerIncludedInTestAccounts(config.designer.id),
  ).map((config) => ({
    profileLabel: isBetaProfileKey(config.key)
      ? '3년차 · 베타'
      : `${config.historyYears}년차 · 주 1명 신규`,
    designerName: config.designer.name ?? config.designer.email,
    designerId: config.designer.id,
    customerCount: getAccumulatedProfileCustomerCount(config),
    password: ACCUMULATED_TEST_PASSWORD,
  }));
}

/** 베타 1:1 계정은 별도 — 누적 프로필 소스에 포함됨 */
const BETA_CUSTOMER_SOURCES: DesignerLinkedCustomerSource[] = [];

const DEMO_DESIGNER_LINKED_CUSTOMERS: BetaTestAccount[] = [
  {
    id: 'demo-customer-kim-jiwon',
    email: DEMO_LOGIN_HINT.customerEmail,
    name: '김지원',
    password: DEMO_LOGIN_HINT.customerPassword,
    role: 'customer',
  },
  {
    id: 'demo-customer-park-minji',
    email: 'demo2@hair.app',
    name: '박민지',
    password: DEMO_LOGIN_HINT.customerPassword,
    role: 'customer',
  },
  {
    id: 'demo-customer-lee-seoyeon',
    email: 'customer@hair.app',
    name: '이서연',
    password: DEMO_LOGIN_HINT.customerPassword,
    role: 'customer',
  },
  SEO_JUNGHYUN_TEST_ACCOUNT,
];

/** 데모 디자이너 시술 연동 고객 */
const DEMO_DESIGNER_CUSTOMER_SOURCES: DesignerLinkedCustomerSource[] = [
  {
    profileLabel: '데모',
    designerName: '김미용 디자이너',
    designerId: 'demo-designer-local',
    customerCount: DEMO_DESIGNER_LINKED_CUSTOMERS.length,
    password: DEMO_LOGIN_HINT.customerPassword,
  },
];

let designerLinkedCustomerSourcesCache: DesignerLinkedCustomerSource[] | null = null;

/** 테스트 로그인 · 가입고객 탭 — 디자이너와 연동된 전체 고객 (첫 접근 시 생성) */
export { DEMO_DESIGNER_LINKED_CUSTOMERS };

/** 디자이너에 연동된 고객 목록 (증원은 해당 프로필만 지연 생성) */
export function getLinkedCustomersForDesigner(designerId: string): BetaTestAccount[] {
  if (designerId === 'demo-designer-local') {
    return DEMO_DESIGNER_LINKED_CUSTOMERS;
  }

  const config = ACCUMULATED_TEST_PROFILE_CONFIGS.find((item) => item.designer.id === designerId);

  if (config && isDemoDesignerIncludedInTestAccounts(config.designer.id)) {
    return resolveAccumulatedProfileCustomers(config);
  }

  return [];
}

export function getDesignerLinkedCustomerLoginSources(): DesignerLinkedCustomerSource[] {
  if (!designerLinkedCustomerSourcesCache) {
    designerLinkedCustomerSourcesCache = [
      ...DEMO_DESIGNER_CUSTOMER_SOURCES,
      ...BETA_CUSTOMER_SOURCES,
      ...getAccumulatedProfileCustomerSources(),
    ];
  }

  return designerLinkedCustomerSourcesCache;
}

/** @deprecated getDesignerLinkedCustomerLoginSources() 사용 */
export const DESIGNER_LINKED_CUSTOMER_LOGIN_SOURCES = new Proxy(
  [] as DesignerLinkedCustomerSource[],
  {
    get(_target, prop) {
      const sources = getDesignerLinkedCustomerLoginSources();
      const value = Reflect.get(sources, prop);

      return typeof value === 'function' ? value.bind(sources) : value;
    },
  },
);

const STATIC_LINKED_CUSTOMER_COUNT = DEMO_DESIGNER_LINKED_CUSTOMERS.length;

const ACCUMULATED_LINKED_CUSTOMER_COUNT = ACCUMULATED_TEST_PROFILE_CONFIGS.filter((config) =>
  isDemoDesignerIncludedInTestAccounts(config.designer.id),
).reduce((sum, config) => sum + getAccumulatedProfileCustomerCount(config), 0);

export const DESIGNER_LINKED_CUSTOMER_COUNT =
  STATIC_LINKED_CUSTOMER_COUNT + ACCUMULATED_LINKED_CUSTOMER_COUNT;
