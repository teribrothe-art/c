import { DEMO_LOGIN_HINT } from './auth';
import { SEO_JUNGHYUN_TEST_ACCOUNT } from './demo-customer-seo-junghyun';
import {
  BETA_CUSTOMERS,
  BETA_DESIGNERS,
  BETA_TEST_PASSWORD,
  type BetaTestAccount,
} from './beta-test-accounts';
import { DESIGNER_LINKED_CUSTOMER_COUNT } from './demo-account-counts';
import {
  ACCUMULATED_TEST_PASSWORD,
  getAccumulatedTestProfileConfigs,
} from './demo-accumulated-test-accounts';

export { DESIGNER_LINKED_CUSTOMER_COUNT };

export type DesignerLinkedCustomerSource = {
  profileLabel: string;
  designerName: string;
  designerId: string;
  customers: BetaTestAccount[];
  password: string;
};

function accumulatedProfileLabelFromKey(key: string) {
  if (key === '1y') {
    return '1년';
  }

  if (key === '3y') {
    return '3년';
  }

  if (key === '5y') {
    return '5년';
  }

  if (key.startsWith('exp-')) {
    return '증원';
  }

  return '2년';
}

function getAccumulatedProfileCustomerSources(): DesignerLinkedCustomerSource[] {
  return getAccumulatedTestProfileConfigs().map((profile) => ({
    profileLabel: accumulatedProfileLabelFromKey(profile.key),
    designerName: profile.designer.name ?? profile.designer.email,
    designerId: profile.designer.id,
    customers: profile.customers,
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

/** 테스트 로그인 · 가입고객 탭 — 디자이너와 연동된 전체 고객 (첫 접근 시 생성) */
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

/** @deprecated getDesignerLinkedCustomerLoginSources() */
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
