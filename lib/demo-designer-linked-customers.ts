import { DEMO_LOGIN_HINT } from './auth';
import { SEO_JUNGHYUN_TEST_ACCOUNT } from './demo-customer-seo-junghyun';
import {
  BETA_CUSTOMERS,
  BETA_DESIGNERS,
  BETA_TEST_PASSWORD,
  type BetaTestAccount,
} from './beta-test-accounts';
import { ACCUMULATED_TEST_PASSWORD, ACCUMULATED_TEST_PROFILE_CONFIGS } from './demo-accumulated-test-accounts';
import {
  NATIONWIDE_DESIGNER_DEFINITIONS,
  NATIONWIDE_REGISTERED_CUSTOMER_TOTAL,
  NATIONWIDE_TEST_PASSWORD,
} from './nationwide-org-catalog';

export type DesignerLinkedCustomerSource = {
  profileLabel: string;
  designerName: string;
  designerId: string;
  customers: BetaTestAccount[];
  password: string;
};

function accumulatedProfileLabel(historyYears: number) {
  const startYear = new Date().getFullYear() - historyYears;

  return `${startYear}~현재`;
}

function getAccumulatedProfileCustomerSources(): DesignerLinkedCustomerSource[] {
  return ACCUMULATED_TEST_PROFILE_CONFIGS.map((config) => ({
    profileLabel: accumulatedProfileLabel(config.historyYears),
    designerName: config.designer.name ?? config.designer.email,
    designerId: config.designer.id,
    customers: config.customers,
    password: ACCUMULATED_TEST_PASSWORD,
  }));
}

/** 베타 디자이너 1:1 연동 고객 */
const BETA_CUSTOMER_SOURCES: DesignerLinkedCustomerSource[] = BETA_CUSTOMERS.map(
  (customer, index) => {
    const designer = BETA_DESIGNERS[index];

    return {
      profileLabel: '베타',
      designerName: designer?.name ?? '베타 디자이너',
      designerId: designer?.id ?? '',
      customers: [customer],
      password: BETA_TEST_PASSWORD,
    };
  },
);

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
    customers: DEMO_DESIGNER_LINKED_CUSTOMERS,
    password: DEMO_LOGIN_HINT.customerPassword,
  },
];

let designerLinkedCustomerSourcesCache: DesignerLinkedCustomerSource[] | null = null;

function getNationwideProfileCustomerSources(): DesignerLinkedCustomerSource[] {
  return NATIONWIDE_DESIGNER_DEFINITIONS.map((definition) => ({
    profileLabel: `전국 ${definition.historyYears}년차`,
    designerName: definition.designer.name ?? definition.designer.email,
    designerId: definition.designer.id,
    customers: definition.customers,
    password: NATIONWIDE_TEST_PASSWORD,
  }));
}

/** 테스트 로그인 · 가입고객 탭 — 디자이너와 연동된 전체 고객 (첫 접근 시 생성) */
export function getDesignerLinkedCustomerLoginSources(): DesignerLinkedCustomerSource[] {
  if (!designerLinkedCustomerSourcesCache) {
    designerLinkedCustomerSourcesCache = [
      ...DEMO_DESIGNER_CUSTOMER_SOURCES,
      ...BETA_CUSTOMER_SOURCES,
      ...getAccumulatedProfileCustomerSources(),
      ...getNationwideProfileCustomerSources(),
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

const STATIC_LINKED_CUSTOMER_COUNT =
  DEMO_DESIGNER_LINKED_CUSTOMERS.length + BETA_CUSTOMERS.length;

const ACCUMULATED_LINKED_CUSTOMER_COUNT = ACCUMULATED_TEST_PROFILE_CONFIGS.reduce(
  (sum, config) => sum + config.customers.length,
  0,
);

export const DESIGNER_LINKED_CUSTOMER_COUNT =
  STATIC_LINKED_CUSTOMER_COUNT +
  ACCUMULATED_LINKED_CUSTOMER_COUNT +
  NATIONWIDE_REGISTERED_CUSTOMER_TOTAL;
