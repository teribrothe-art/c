import { Platform } from 'react-native';

import {
  demoGetItem,
  demoMultiRemove,
  demoMultiSet,
  demoSetItem,
  prefetchDemoWorkspaceStorage,
} from './demo-async-storage';
import { invalidateGeneralSignupCustomersCache } from './demo-general-signup-customers';
import { lookupDemoCatalogUser } from './demo-user-catalog';
import { isSupabaseConfigured, supabase } from './supabase';
import type { UserRole } from './user-role';

export type { UserRole } from './user-role';
export { DEMO_LOGIN_HINT } from './demo-login-hint';

export type AuthUser = {
  id: string;
  email: string;
  role?: UserRole | null;
};

type DemoUser = AuthUser & {
  name: string | null;
  password: string;
  role: UserRole;
};

type AuthStateListener = (user: AuthUser | null) => void;

type SignupInput = {
  email: string;
  password: string;
  name?: string;
  role: UserRole;
};

type LoginInput = {
  email: string;
  password: string;
};

const DEMO_USERS_KEY = 'hair-diary-demo-users';
const DEMO_SESSION_KEY = 'hair-diary-demo-session';
const DEMO_SESSION_USER_KEY = 'hair-diary-demo-session-user';

let demoSessionCache: AuthUser | null = null;
let demoUsersCache: DemoUser[] | null = null;
let authReadyPromise: Promise<void> | null = null;

function hydrateDemoSessionCacheFromWebStorage() {
  if (!isDemoAuthMode || demoSessionCache || Platform.OS !== 'web') {
    return;
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const rawSessionUser = window.localStorage.getItem(DEMO_SESSION_USER_KEY);

    if (!rawSessionUser) {
      return;
    }

    const parsed = JSON.parse(rawSessionUser) as AuthUser;

    if (parsed?.id && parsed.email) {
      demoSessionCache = parsed;
    }
  } catch {
    // ignore corrupt session payload
  }
}

hydrateDemoSessionCacheFromWebStorage();

/** HMR·새로고침 직후 localStorage 세션을 먼저 복원 */
export function ensureAuthReady(): Promise<void> {
  if (authReadyPromise) {
    return authReadyPromise;
  }

  authReadyPromise = (async () => {
    hydrateDemoSessionCacheFromWebStorage();

    if (isDemoAuthMode) {
      await prefetchDemoWorkspaceStorage();
      await getDemoCurrentUser();
    }
  })();

  return authReadyPromise;
}

/** 웹·데모에서 바로 로그인 테스트용 (시술 더미 데이터와 ID 일치) */
const SEEDED_DEMO_USERS: DemoUser[] = [
  {
    id: 'demo-customer-kim-jiwon',
    email: 'demo@hair.app',
    name: '김지원',
    password: 'demo1234',
    role: 'customer',
  },
  {
    id: 'demo-customer-park-minji',
    email: 'demo2@hair.app',
    name: '박민지',
    password: 'demo1234',
    role: 'customer',
  },
  {
    id: 'demo-customer-lee-seoyeon',
    email: 'customer@hair.app',
    name: '이서연',
    password: 'demo1234',
    role: 'customer',
  },
  {
    id: 'demo-customer-seo-junghyun',
    email: 'seo-junghyun@hair.app',
    name: '서정현',
    password: 'demo1234',
    role: 'customer',
  },
  {
    id: 'demo-designer-local',
    email: 'designer@hair.app',
    name: '김미용 디자이너',
    password: 'demo1234',
    role: 'designer',
  },
];

export const isDemoAuthMode = !isSupabaseConfigured || !supabase;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toAuthUser(user: DemoUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

async function readDemoUsersFromStorage() {
  const rawUsers = await demoGetItem(DEMO_USERS_KEY);
  return rawUsers ? (JSON.parse(rawUsers) as DemoUser[]) : [];
}

async function ensureDemoUsersSeeded() {
  const existing = await readDemoUsersFromStorage();

  if (existing.length === 0) {
    await saveDemoUsers(SEEDED_DEMO_USERS);
    return SEEDED_DEMO_USERS;
  }

  const byEmail = new Map(existing.map((user) => [user.email, user]));
  let changed = false;

  for (const seeded of SEEDED_DEMO_USERS) {
    const stored = byEmail.get(seeded.email);

    if (!stored) {
      existing.push(seeded);
      changed = true;
      continue;
    }

    if (
      stored.id !== seeded.id ||
      stored.role !== seeded.role ||
      stored.password !== seeded.password ||
      (seeded.name && stored.name !== seeded.name)
    ) {
      Object.assign(stored, {
        id: seeded.id,
        role: seeded.role,
        password: seeded.password,
        name: seeded.name ?? stored.name,
      });
      changed = true;
    }
  }

  if (changed) {
    await saveDemoUsers(existing);
  }

  return existing;
}

async function registerDemoCatalogUser(catalogUser: {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: UserRole;
}) {
  const users = await readDemoUsersFromStorage();
  const normalizedEmail = normalizeEmail(catalogUser.email);
  const existing = users.find((item) => normalizeEmail(item.email) === normalizedEmail);

  if (existing) {
    Object.assign(existing, {
      id: catalogUser.id,
      role: catalogUser.role,
      password: catalogUser.password,
      name: catalogUser.name ?? existing.name,
    });
  } else {
    users.push({
      id: catalogUser.id,
      email: catalogUser.email,
      name: catalogUser.name,
      password: catalogUser.password,
      role: catalogUser.role,
    });
  }

  await saveDemoUsers(users);
  return users.find((item) => normalizeEmail(item.email) === normalizedEmail)!;
}

async function getDemoUsers() {
  if (demoUsersCache) {
    return demoUsersCache;
  }

  demoUsersCache = await ensureDemoUsersSeeded();
  return demoUsersCache;
}

async function saveDemoUsers(users: DemoUser[]) {
  demoUsersCache = users;
  await demoSetItem(DEMO_USERS_KEY, JSON.stringify(users));
}

function findSeededDemoUser(normalizedEmail: string, password: string) {
  return SEEDED_DEMO_USERS.find(
    (item) => item.email === normalizedEmail && item.password === password,
  );
}

function schedulePersistCatalogUser(catalogUser: {
  id: string;
  email: string;
  name: string | null;
  password: string;
  role: UserRole;
}) {
  void registerDemoCatalogUser(catalogUser).catch(() => {
    demoUsersCache = null;
  });
}

async function persistDemoSession(user: AuthUser) {
  demoSessionCache = user;
  await demoMultiSet([
    [DEMO_SESSION_KEY, user.id],
    [DEMO_SESSION_USER_KEY, JSON.stringify(user)],
  ]);
}

async function getDemoCurrentUser() {
  if (demoSessionCache) {
    return demoSessionCache;
  }

  const rawSessionUser = await demoGetItem(DEMO_SESSION_USER_KEY);

  if (rawSessionUser) {
    try {
      const parsed = JSON.parse(rawSessionUser) as AuthUser;

      if (parsed?.id && parsed.email) {
        demoSessionCache = parsed;
        return parsed;
      }
    } catch {
      // ignore corrupt session payload
    }
  }

  const currentUserId = await demoGetItem(DEMO_SESSION_KEY);

  if (!currentUserId) {
    return null;
  }

  const users = await getDemoUsers();
  const user = users.find((item) => item.id === currentUserId);
  const authUser = user ? toAuthUser(user) : null;
  demoSessionCache = authUser;

  if (authUser) {
    await demoSetItem(DEMO_SESSION_USER_KEY, JSON.stringify(authUser));
  }

  return authUser;
}

export async function signUpWithEmail({ email, password, name, role }: SignupInput) {
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = name?.trim() || null;

  if (!isDemoAuthMode && supabase) {
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: trimmedName,
          role,
        },
      },
    });

    if (signupError) {
      throw signupError;
    }

    let user = signupData.user;

    if (!signupData.session) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginError) {
        throw new Error(
          `${loginError.message} 이메일 확인이 켜져 있다면 인증 후 다시 로그인해주세요.`,
        );
      }

      user = loginData.user ?? user;
    }

    if (!user) {
      throw new Error('가입한 사용자 정보를 확인할 수 없습니다.');
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? normalizedEmail,
        name: trimmedName,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      throw profileError;
    }

    return {
      id: user.id,
      email: user.email ?? normalizedEmail,
      role,
    };
  }

  const users = await getDemoUsers();
  const existingUserIndex = users.findIndex((item) => item.email === normalizedEmail);

  if (existingUserIndex >= 0) {
    const updatedUser: DemoUser = {
      ...users[existingUserIndex],
      name: trimmedName,
      password,
      role,
    };
    const nextUsers = [...users];
    nextUsers[existingUserIndex] = updatedUser;

    await saveDemoUsers(nextUsers);
    await demoSetItem(DEMO_SESSION_KEY, updatedUser.id);
    invalidateGeneralSignupCustomersCache();

    return toAuthUser(updatedUser);
  }

  const newUser: DemoUser = {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    email: normalizedEmail,
    name: trimmedName,
    password,
    role,
  };

  await saveDemoUsers([...users, newUser]);
  await demoSetItem(DEMO_SESSION_KEY, newUser.id);
  invalidateGeneralSignupCustomersCache();

  return toAuthUser(newUser);
}

export async function signInWithEmail({ email, password }: LoginInput) {
  const normalizedEmail = normalizeEmail(email);

  if (!isDemoAuthMode && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('로그인한 사용자 정보를 확인할 수 없습니다.');
    }

    await supabase.auth.getSession();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    return {
      id: data.user.id,
      email: data.user.email ?? normalizedEmail,
      role: profile?.role as UserRole | null | undefined,
    };
  }

  const seeded = findSeededDemoUser(normalizedEmail, password);

  if (seeded) {
    const authUser = toAuthUser(seeded);
    await persistDemoSession(authUser);
    return authUser;
  }

  const catalogUser = lookupDemoCatalogUser(normalizedEmail, password);

  if (catalogUser) {
    const authUser: AuthUser = {
      id: catalogUser.id,
      email: catalogUser.email,
      role: catalogUser.role,
    };
    await persistDemoSession(authUser);
    schedulePersistCatalogUser(catalogUser);
    return authUser;
  }

  const users = await getDemoUsers();
  const user = users.find((item) => item.email === normalizedEmail && item.password === password);

  if (!user) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  const authUser = toAuthUser(user);
  await persistDemoSession(authUser);
  return authUser;
}

export async function getCurrentUser() {
  await ensureAuthReady();

  if (!isDemoAuthMode && supabase) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (!sessionError && sessionData.session?.user) {
      const data = { user: sessionData.session.user };

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      return {
        id: data.user.id,
        email: data.user.email ?? '이메일 정보 없음',
        role: profile?.role as UserRole | null | undefined,
      };
    }

    const demoUser = await getDemoCurrentUser();

    if (demoUser) {
      demoSessionCache = demoUser;
      return demoUser;
    }

    return null;
  }

  const demoUser = await getDemoCurrentUser();
  if (demoUser) {
    demoSessionCache = demoUser;
  }

  return demoUser;
}

export async function signOut() {
  if (!isDemoAuthMode && supabase) {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    return;
  }

  demoSessionCache = null;
  demoUsersCache = null;
  authReadyPromise = null;
  await demoMultiRemove([DEMO_SESSION_KEY, DEMO_SESSION_USER_KEY]);

  if (__DEV__ && typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('hair-diary-dev-last-route');
  }
}

export function subscribeToAuthState(listener: AuthStateListener) {
  if (!isDemoAuthMode && supabase) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      listener(
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email ?? '이메일 정보 없음',
            }
          : null,
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  let isSubscribed = true;

  getDemoCurrentUser().then((user) => {
    if (isSubscribed) {
      listener(user);
    }
  });

  return () => {
    isSubscribed = false;
  };
}


export async function getCurrentUserRole() {
  const user = await getCurrentUser();
  return user?.role ?? null;
}
