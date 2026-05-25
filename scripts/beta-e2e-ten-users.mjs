#!/usr/bin/env node
/**
 * 디자이너 5명 + 고객 5명 순차 E2E (데모 모드 로직 미러)
 * 실행: node scripts/beta-e2e-ten-users.mjs
 */

const PASSWORD = 'beta1234';
const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const store = new Map();

const storage = {
  getItem: async (key) => store.get(key) ?? null,
  setItem: async (key, value) => store.set(key, value),
  removeItem: async (key) => store.delete(key),
};

function log(step, msg) {
  console.log(`  [${step}] ${msg}`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function generateInviteCode(existing) {
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i += 1) {
      code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
    }
  } while (existing.has(code));
  existing.add(code);
  return code;
}

async function getUsers() {
  const raw = await storage.getItem('hair-diary-demo-users');
  return raw ? JSON.parse(raw) : [];
}

async function saveUsers(users) {
  await storage.setItem('hair-diary-demo-users', JSON.stringify(users));
}

async function setSession(userId) {
  await storage.setItem('hair-diary-demo-session', userId);
}

async function getSessionUser() {
  const id = await storage.getItem('hair-diary-demo-session');
  if (!id) return null;
  const users = await getUsers();
  return users.find((u) => u.id === id) ?? null;
}

async function signUp({ email, password, name, role, id }) {
  const users = await getUsers();
  const normalized = normalizeEmail(email);

  if (users.some((u) => u.email === normalized)) {
    const existing = users.find((u) => u.email === normalized);
    await setSession(existing.id);
    return existing;
  }

  const user = {
    id: id ?? `demo-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: normalized,
    name,
    password,
    role,
  };

  users.push(user);
  await saveUsers(users);
  await setSession(user.id);
  return user;
}

async function signIn(email, password) {
  const users = await getUsers();
  const user = users.find(
    (u) => u.email === normalizeEmail(email) && u.password === password,
  );

  if (!user) throw new Error(`로그인 실패: ${email}`);
  await setSession(user.id);
  return user;
}

async function signOut() {
  await storage.removeItem('hair-diary-demo-session');
}

async function getTreatments() {
  const raw = await storage.getItem('hair-diary-demo-treatments');
  return raw ? JSON.parse(raw) : [];
}

async function saveTreatments(items) {
  await storage.setItem('hair-diary-demo-treatments', JSON.stringify(items));
}

async function createTreatment(designer, { customerName, treatmentType, price }) {
  const items = await getTreatments();
  const treatment = {
    id: `demo-treatment-beta-${designer.id}-${Date.now()}`,
    customer_id: null,
    designer_id: designer.id,
    designer_name: designer.name,
    customer_name: customerName,
    treatment_date: new Date().toISOString().slice(0, 10),
    treatment_type: treatmentType,
    treatment_title: `${treatmentType} 시술`,
    price,
    payment_status: 'pending',
    technique: '레이어 컷',
    designer_diagnosis: '모발 건조, 끝 손상 6/10',
    home_care: '주 2회 헤어팩',
    damage_level: 5,
    duration: '1시간 30분',
    feedback_completed: false,
  };

  items.unshift(treatment);
  await saveTreatments(items);
  return treatment;
}

async function getInvitations() {
  const raw = await storage.getItem('hair-diary-customer-invitations');
  return raw ? JSON.parse(raw) : [];
}

async function saveInvitations(items) {
  await storage.setItem('hair-diary-customer-invitations', JSON.stringify(items));
}

async function createInvitation(designer, treatment, customerName) {
  const items = await getInvitations();
  const codes = new Set(items.map((i) => i.invite_code));
  const invitation = {
    id: `demo-invite-${Date.now()}`,
    invite_code: generateInviteCode(codes),
    designer_id: designer.id,
    treatment_id: treatment.id,
    customer_name: customerName,
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    used_at: null,
    used_by: null,
    created_at: new Date().toISOString(),
  };

  items.unshift(invitation);
  await saveInvitations(items);
  return invitation;
}

async function redeemInvitation(invitation, customer) {
  const items = await getInvitations();
  const idx = items.findIndex((i) => i.id === invitation.id);
  assert(idx >= 0, '초대 없음');

  items[idx] = {
    ...items[idx],
    status: 'used',
    used_at: new Date().toISOString(),
    used_by: customer.id,
  };

  await saveInvitations(items);

  const treatments = await getTreatments();
  const tIdx = treatments.findIndex((t) => t.id === invitation.treatment_id);
  assert(tIdx >= 0, '시술 없음');
  treatments[tIdx] = { ...treatments[tIdx], customer_id: customer.id };
  await saveTreatments(treatments);

  const relRaw = await storage.getItem('hair-diary-designer-customer-relationships');
  const rels = relRaw ? JSON.parse(relRaw) : [];

  if (!rels.some((r) => r.designer_id === invitation.designer_id && r.customer_id === customer.id)) {
    rels.unshift({
      id: `rel-${Date.now()}`,
      designer_id: invitation.designer_id,
      customer_id: customer.id,
      created_at: new Date().toISOString(),
    });
    await storage.setItem('hair-diary-designer-customer-relationships', JSON.stringify(rels));
  }

  return treatments[tIdx];
}

async function requestPayment(treatment) {
  if (!treatment.customer_id) {
    throw new Error('고객 미연결');
  }

  const treatments = await getTreatments();
  const idx = treatments.findIndex((t) => t.id === treatment.id);
  treatments[idx] = { ...treatments[idx], payment_status: 'payment_requested' };
  await saveTreatments(treatments);
  return treatments[idx];
}

async function completePayment(treatment) {
  const treatments = await getTreatments();
  const idx = treatments.findIndex((t) => t.id === treatment.id);
  treatments[idx] = {
    ...treatments[idx],
    payment_status: 'escrow',
    paid_at: new Date().toISOString(),
  };
  await saveTreatments(treatments);

  const payRaw = await storage.getItem('hair-diary-demo-payments');
  const payments = payRaw ? JSON.parse(payRaw) : [];
  payments.push({
    id: `pay-${treatment.id}`,
    treatment_id: treatment.id,
    customer_id: treatment.customer_id,
    designer_id: treatment.designer_id,
    amount: treatment.price,
    status: 'paid',
  });
  await storage.setItem('hair-diary-demo-payments', JSON.stringify(payments));

  return treatments[idx];
}

async function customerTreatments(customerId) {
  const items = await getTreatments();
  return items.filter((t) => t.customer_id === customerId);
}

const DESIGNERS = [
  { id: 'beta-designer-01', email: 'beta-designer-1@hair.app', name: '베타디자이너1' },
  { id: 'beta-designer-02', email: 'beta-designer-2@hair.app', name: '베타디자이너2' },
  { id: 'beta-designer-03', email: 'beta-designer-3@hair.app', name: '베타디자이너3' },
  { id: 'beta-designer-04', email: 'beta-designer-4@hair.app', name: '베타디자이너4' },
  { id: 'beta-designer-05', email: 'beta-designer-5@hair.app', name: '베타디자이너5' },
];

async function runPair(index) {
  const designer = DESIGNERS[index - 1];
  const customerEmail = `beta-customer-${index}@hair.app`;
  const customerName = `베타고객${index}`;

  console.log(`\n━━━ 페어 ${index}/5: ${designer.name} ↔ ${customerName} ━━━`);

  await signIn(designer.email, PASSWORD);
  log('designer', `로그인 ${designer.email}`);

  const treatment = await createTreatment(await getSessionUser(), {
    customerName,
    treatmentType: '컷',
    price: 120000 + index * 10000,
  });
  log('treatment', `시술 생성 ${treatment.id}`);

  const invitation = await createInvitation(designer, treatment, customerName);
  log('invite', `초대 코드 ${invitation.invite_code}`);

  await signOut();

  const customer = await signUp({
    id: `beta-customer-0${index}`,
    email: customerEmail,
    password: PASSWORD,
    name: customerName,
    role: 'customer',
  });
  log('customer', `가입 ${customer.email}`);

  const linked = await redeemInvitation(invitation, customer);
  assert(linked.customer_id === customer.id, '시술 연결 실패');
  log('link', '초대 사용 → customer_id 연결 OK');

  const diary = await customerTreatments(customer.id);
  assert(diary.some((t) => t.id === treatment.id), '다이어리에 시술 없음');
  log('diary', `고객 다이어리 ${diary.length}건`);

  await signIn(designer.email, PASSWORD);
  const paidRequested = await requestPayment(linked);
  assert(paidRequested.payment_status === 'payment_requested', '결제 요청 실패');
  log('payment-req', '결제 요청 OK');

  await signOut();
  await signIn(customerEmail, PASSWORD);
  const paid = await completePayment(paidRequested);
  assert(paid.payment_status === 'escrow', '결제 완료 실패');
  log('payment', '고객 결제(escrow) OK');

  await signOut();

  return { designer: designer.email, customer: customerEmail, inviteCode: invitation.invite_code, treatmentId: treatment.id };
}

async function seedDesigners() {
  console.log('\n📌 디자이너 5명 등록');
  for (let i = 0; i < DESIGNERS.length; i += 1) {
    const d = DESIGNERS[i];
    await signUp({
      id: d.id,
      email: d.email,
      password: PASSWORD,
      name: d.name,
      role: 'designer',
    });
    await signOut();
    console.log(`  ✓ ${d.email}`);
  }
}

async function main() {
  console.log('🧪 베타 E2E — 디자이너 5 + 고객 5 순차 검증\n');

  const seedTreatments = await storage.getItem('hair-diary-demo-treatments');
  if (!seedTreatments) {
    await storage.setItem('hair-diary-demo-treatments', '[]');
  }

  await seedDesigners();

  const results = [];

  for (let i = 1; i <= 5; i += 1) {
    results.push(await runPair(i));
  }

  console.log('\n📊 결과 요약');
  console.table(results);

  const users = await getUsers();
  const designers = users.filter((u) => u.role === 'designer');
  const customers = users.filter((u) => u.role === 'customer');
  const treatments = await getTreatments();
  const invites = await getInvitations();

  console.log(`\n총계: 디자이너 ${designers.length}명, 고객 ${customers.length}명, 시술 ${treatments.length}건, 초대 ${invites.length}건`);
  console.log('\n✅ 전체 E2E 통과\n');
}

main().catch((error) => {
  console.error('\n❌ E2E 실패:', error.message);
  process.exit(1);
});
