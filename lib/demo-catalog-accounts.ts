import type { BetaTestAccount } from './beta-test-accounts';
import { ADMIN_TEST_ACCOUNT } from './admin-test-accounts';
import { BETA_CUSTOMERS, BETA_DESIGNERS } from './beta-test-accounts';
import {
  ACCUMULATED_TEST_DESIGNER,
  ACCUMULATED_TEST_DESIGNER_1Y,
  ACCUMULATED_TEST_DESIGNER_ACCUM_3Y,
  ACCUMULATED_TEST_DESIGNER_ACCUM_5Y,
  ACCUMULATED_TEST_PASSWORD,
} from './demo-accumulated-test-accounts';
import { DEMO_LOGIN_HINT } from './demo-login-hint';
import { SEO_JUNGHYUN_TEST_ACCOUNT } from './demo-customer-seo-junghyun';
import {
  FLEET_100_DESIGNER_ACCOUNTS,
  FLEET_100_TEST_PASSWORD,
} from './demo-fleet-100-designers';
import { filterDemoDesignersWithCustomers } from './demo-designer-customer-counts';
import { STORE_TEST_ACCOUNTS } from './store-test-accounts';
import type { UserRole } from './user-role';

const DEMO_AUTH_CUSTOMERS: BetaTestAccount[] = [
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

const ACCUMULATED_TEST_DESIGNERS = [
  ACCUMULATED_TEST_DESIGNER,
  ACCUMULATED_TEST_DESIGNER_1Y,
  ACCUMULATED_TEST_DESIGNER_ACCUM_3Y,
  ACCUMULATED_TEST_DESIGNER_ACCUM_5Y,
] as const;

/** 카탈로그 맵용 — 증원 디자이너 배열 (20명) */
export function getDemoCatalogLightweightAccounts(): BetaTestAccount[] {
  return [
    ADMIN_TEST_ACCOUNT,
    ...STORE_TEST_ACCOUNTS,
    ...filterDemoDesignersWithCustomers(BETA_DESIGNERS),
    ...BETA_CUSTOMERS,
    ...filterDemoDesignersWithCustomers(ACCUMULATED_TEST_DESIGNERS),
    ...DEMO_AUTH_CUSTOMERS,
  ];
}

/** 데모 로그인 카탈로그 전체 (증원 디자이너 포함) */
export function getDemoCatalogSeedAccounts(): BetaTestAccount[] {
  return [
    ...getDemoCatalogLightweightAccounts(),
    ...filterDemoDesignersWithCustomers(FLEET_100_DESIGNER_ACCOUNTS),
  ];
}

function pad3(value: number) {
  return String(value).padStart(3, '0');
}

/** 이메일 패턴으로 증원·누적 테스트 고객 로그인 (전체 카탈로그 생성 없음) */
export function resolveDemoCatalogUserByEmail(
  email: string,
  password: string,
): {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: UserRole;
} | null {
  const normalized = email.trim().toLowerCase();

  const fleetDesigner = /^test-fleet-(\d{3})@hair\.app$/.exec(normalized);

  if (fleetDesigner) {
    if (password !== FLEET_100_TEST_PASSWORD) {
      return null;
    }

    const slot = fleetDesigner[1];

    return {
      id: `test-fleet-${slot}`,
      email: normalized,
      name: `증원 디자이너 ${slot}`,
      password: FLEET_100_TEST_PASSWORD,
      role: 'designer',
    };
  }

  const fleetCustomer = /^test-fleet-(\d{3})-customer-(\d+)@hair\.app$/.exec(normalized);

  if (fleetCustomer) {
    if (password !== FLEET_100_TEST_PASSWORD) {
      return null;
    }

    const slot = fleetCustomer[1];
    const index = Number(fleetCustomer[2]);

    return {
      id: `test-fleet-${slot}-customer-${pad3(index)}`,
      email: normalized,
      name: `증원고객 ${slot}-${index}`,
      password: FLEET_100_TEST_PASSWORD,
      role: 'customer',
    };
  }

  const accumRules: { pattern: RegExp; id: (n: number) => string }[] = [
    {
      pattern: /^test-customer-(\d+)@hair\.app$/,
      id: (n) => `test-customer-${String(n).padStart(2, '0')}`,
    },
    {
      pattern: /^test-1y-customer-(\d+)@hair\.app$/,
      id: (n) => `test-1y-customer-${String(n).padStart(2, '0')}`,
    },
    {
      pattern: /^test-3y-customer-(\d+)@hair\.app$/,
      id: (n) => `test-3y-customer-${String(n).padStart(3, '0')}`,
    },
    {
      pattern: /^test-5y-customer-(\d+)@hair\.app$/,
      id: (n) => `test-5y-customer-${String(n).padStart(3, '0')}`,
    },
  ];

  if (password === ACCUMULATED_TEST_PASSWORD) {
    const betaCustomer = /^beta(\d{2})-customer-(\d+)@hair\.app$/.exec(normalized);

    if (betaCustomer) {
      const slot = betaCustomer[1];
      const index = Number(betaCustomer[2]);

      return {
        id: `beta${slot}-customer-${String(index).padStart(3, '0')}`,
        email: normalized,
        name: `베타 3년차 고객 ${slot}-${index}`,
        password: ACCUMULATED_TEST_PASSWORD,
        role: 'customer',
      };
    }

    for (const rule of accumRules) {
      const match = rule.pattern.exec(normalized);

      if (match) {
        const index = Number(match[1]);

        return {
          id: rule.id(index),
          email: normalized,
          name: '누적 테스트 고객',
          password: ACCUMULATED_TEST_PASSWORD,
          role: 'customer',
        };
      }
    }

    for (const designer of ACCUMULATED_TEST_DESIGNERS) {
      if (normalized === designer.email.trim().toLowerCase()) {
        return {
          id: designer.id,
          email: normalized,
          name: designer.name ?? null,
          password: ACCUMULATED_TEST_PASSWORD,
          role: 'designer',
        };
      }
    }
  }

  return null;
}
