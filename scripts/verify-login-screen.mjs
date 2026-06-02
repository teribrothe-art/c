#!/usr/bin/env node
/**
 * 로그인 화면·데모 인증 플로우 검증 (Node에서 auth 로직 미러)
 * 실행: node scripts/verify-login-screen.mjs
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SEEDED_DEMO_USERS = [
  {
    id: 'demo-customer-kim-jiwon',
    email: 'demo@hair.app',
    password: 'demo1234',
    role: 'customer',
  },
  {
    id: 'demo-designer-local',
    email: 'designer@hair.app',
    password: 'demo1234',
    role: 'designer',
  },
];

const store = new Map();

const storage = {
  getItem: async (key) => store.get(key) ?? null,
  setItem: async (key, value) => store.set(key, value),
  removeItem: async (key) => store.delete(key),
};

const DEMO_USERS_KEY = 'hair-diary-demo-users';
const DEMO_SESSION_KEY = 'hair-diary-demo-session';

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validateEmail(email) {
  const trimmed = email.trim();

  if (!trimmed) {
    return '이메일을 입력해주세요.';
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return '올바른 이메일 형식이 아닙니다.';
  }

  return null;
}

function validateLoginForm(email, password) {
  const emailError = validateEmail(email);
  const passwordError = !password ? '비밀번호를 입력해주세요.' : null;

  return {
    valid: !emailError && !passwordError,
    emailError,
    passwordError,
  };
}

async function ensureDemoUsersSeeded() {
  const raw = await storage.getItem(DEMO_USERS_KEY);

  if (!raw) {
    await storage.setItem(DEMO_USERS_KEY, JSON.stringify(SEEDED_DEMO_USERS));
    return SEEDED_DEMO_USERS;
  }

  return JSON.parse(raw);
}

async function signInWithEmail(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const users = await ensureDemoUsersSeeded();
  const user = users.find((item) => item.email === normalizedEmail && item.password === password);

  if (!user) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  await storage.setItem(DEMO_SESSION_KEY, user.id);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

async function getCurrentUser() {
  const sessionId = await storage.getItem(DEMO_SESSION_KEY);

  if (!sessionId) {
    return null;
  }

  const users = await ensureDemoUsersSeeded();
  const user = users.find((item) => item.id === sessionId);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

async function signOut() {
  await storage.removeItem(DEMO_SESSION_KEY);
}

function getPostAuthRoute(user) {
  if (!user) {
    return '/';
  }

  if (user.role === 'designer') {
    return '/designer/home';
  }

  if (user.role === 'store') {
    return '/store';
  }

  if (user.role === 'admin') {
    return '/admin';
  }

  return '/customer-home';
}

async function run() {
  await storage.removeItem(DEMO_USERS_KEY);
  await storage.removeItem(DEMO_SESSION_KEY);

  const emptyForm = validateLoginForm('', '');
  assert(!emptyForm.valid, 'empty form rejected');
  assert(emptyForm.emailError === '이메일을 입력해주세요.', 'email required message');
  assert(emptyForm.passwordError === '비밀번호를 입력해주세요.', 'password required message');

  const badEmail = validateLoginForm('not-an-email', 'demo1234');
  assert(!badEmail.valid, 'invalid email rejected');
  assert(badEmail.emailError === '올바른 이메일 형식이 아닙니다.', 'invalid email message');

  const okForm = validateLoginForm('designer@hair.app', 'demo1234');
  assert(okForm.valid, 'valid form accepted');

  let failed = false;

  try {
    await signInWithEmail('designer@hair.app', 'wrong-pass');
  } catch (error) {
    failed = true;
    assert(
      error.message.includes('이메일 또는 비밀번호'),
      'wrong password throws login error',
    );
  }

  assert(failed, 'wrong password does not succeed');

  const designer = await signInWithEmail('designer@hair.app', 'demo1234');
  assert(designer.role === 'designer', 'designer login role');
  assert(designer.id === 'demo-designer-local', 'designer login id');

  let sessionUser = await getCurrentUser();
  assert(sessionUser?.id === designer.id, 'session persists after login');
  assert(getPostAuthRoute(sessionUser) === '/designer/home', 'designer redirect route');

  await signOut();
  sessionUser = await getCurrentUser();
  assert(sessionUser === null, 'sign out clears session');

  const customer = await signInWithEmail('demo@hair.app', 'demo1234');
  assert(customer.role === 'customer', 'customer login role');
  assert(getPostAuthRoute(customer) === '/customer-home', 'customer redirect route');

  console.log('✅ verify-login-screen: form validation · demo login · session · redirect OK');
}

run().catch((error) => {
  console.error('❌ verify-login-screen failed:', error.message);
  process.exit(1);
});
