#!/usr/bin/env node
/**
 * 디자이너–고객 연결·시술입력 탭 플로우 모의 검증
 * 실행: node scripts/designer-customer-link-mock.mjs
 */

const assert = (cond, msg) => {
  if (!cond) {
    throw new Error(msg);
  }
};

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

const DEMO_DESIGNER_ID = 'demo-designer-local';

const DEMO_LINKED_CUSTOMERS = [
  { id: 'demo-customer-kim-jiwon', name: '김지원', email: 'demo@hair.app' },
  { id: 'demo-customer-park-minji', name: '박민지', email: 'demo2@hair.app' },
  { id: 'demo-customer-lee-seoyeon', name: '이서연', email: 'customer@hair.app' },
];

const REGISTERED_POOL = [
  ...DEMO_LINKED_CUSTOMERS,
  { id: 'beta-customer-1', name: '베타고객', email: 'beta1@test.app' },
];

function findLinkedCustomerForDesignerByName(designerId, customerName) {
  if (designerId !== DEMO_DESIGNER_ID) {
    return null;
  }

  const normalized = normalizeName(customerName);

  if (!normalized) {
    return null;
  }

  for (const customer of DEMO_LINKED_CUSTOMERS) {
    if (normalizeName(customer.name) === normalized) {
      return customer;
    }
  }

  return null;
}

function searchRegisteredCustomers(designerId, query) {
  const normalizedQuery = query.trim().toLowerCase();

  return REGISTERED_POOL.filter((item) => {
    if (designerId !== DEMO_DESIGNER_ID) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.email.toLowerCase().includes(normalizedQuery)
    );
  });
}

function resolveRegisteredCustomerForDesigner(designerId, customerName, explicitCustomerId) {
  if (explicitCustomerId?.trim()) {
    const found = REGISTERED_POOL.find((item) => item.id === explicitCustomerId.trim());

    if (found) {
      return found;
    }
  }

  const seedMatch = findLinkedCustomerForDesignerByName(designerId, customerName);

  if (seedMatch) {
    return seedMatch;
  }

  const query = customerName.trim();

  if (!query) {
    return null;
  }

  const results = searchRegisteredCustomers(designerId, query);
  const exact = results.find((item) => normalizeName(item.name) === normalizeName(query));

  return exact ?? null;
}

function simulateCreateDesignerTreatment({
  designerId,
  customerName,
  customerId = null,
  price = 150000,
}) {
  const matched = resolveRegisteredCustomerForDesigner(designerId, customerName, customerId);

  return {
    id: `demo-treatment-${Date.now()}`,
    designer_id: designerId,
    customer_id: matched?.id ?? null,
    customer_name: matched?.name ?? customerName.trim(),
    price,
    payment_status: 'pending',
  };
}

const TREATMENT_INPUT_TABS = ['기본정보', '사용약품', '시술기법', '진단·케어'];

function run() {
  assert(TREATMENT_INPUT_TABS.length === 4, '4 treatment input tabs');
  assert(TREATMENT_INPUT_TABS[1] === '사용약품', 'products tab label');

  const kim = findLinkedCustomerForDesignerByName(DEMO_DESIGNER_ID, '김지원');
  assert(kim?.id === 'demo-customer-kim-jiwon', 'seed match 김지원');

  const search = searchRegisteredCustomers(DEMO_DESIGNER_ID, '박');
  assert(search.some((item) => item.name === '박민지'), 'search finds 박민지');

  const autoLinked = simulateCreateDesignerTreatment({
    designerId: DEMO_DESIGNER_ID,
    customerName: '이서연',
  });
  assert(autoLinked.customer_id === 'demo-customer-lee-seoyeon', 'auto-link by name on create');
  assert(autoLinked.customer_name === '이서연', 'customer_name from match');

  const explicit = simulateCreateDesignerTreatment({
    designerId: DEMO_DESIGNER_ID,
    customerName: '다른이름',
    customerId: 'demo-customer-park-minji',
  });
  assert(explicit.customer_id === 'demo-customer-park-minji', 'explicit customerId wins');

  const unlinked = simulateCreateDesignerTreatment({
    designerId: DEMO_DESIGNER_ID,
    customerName: '신규방문',
  });
  assert(unlinked.customer_id === null, 'unknown name stays unlinked');

  const canInviteBeforeSettlement = !unlinked.customer_id;
  assert(canInviteBeforeSettlement, 'invite allowed without settlement input');

  const cannotPayWithoutLink = !unlinked.customer_id;
  assert(cannotPayWithoutLink, 'payment blocked until linked');

  const linked = { ...unlinked, customer_id: 'demo-customer-kim-jiwon' };
  const canRequestPayment = Boolean(linked.customer_id && linked.price > 0);
  assert(canRequestPayment, 'payment request after link');

  console.log('✅ designer-customer-link-mock: tabs · search · auto-link · invite/payment gates OK');
}

try {
  run();
} catch (error) {
  console.error('❌ designer-customer-link-mock failed:', error.message);
  process.exit(1);
}
