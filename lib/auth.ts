import AsyncStorage from '@react-native-async-storage/async-storage';

import { ADMIN_TEST_ACCOUNT } from './admin-test-accounts';
import { STORE_TEST_ACCOUNTS } from './store-test-accounts';
import { BETA_CUSTOMERS, BETA_DESIGNERS } from './beta-test-accounts';
import { ACCUMULATED_TEST_ACCOUNTS } from './demo-accumulated-test-accounts';
import { isSupabaseConfigured, supabase } from './supabase';

export type UserRole = 'customer' | 'designer' | 'store' | 'admin';

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
    id: 'demo-designer-local',
    email: 'designer@hair.app',
    name: '김미용 디자이너',
    password: 'demo1234',
    role: 'designer',
  },
];

export const DEMO_LOGIN_HINT = {
  customerEmail: 'demo@hair.app',
  customerPassword: 'demo1234',
  designerEmail: 'designer@hair.app',
  designerPassword: 'demo1234',
} as const;

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
  const rawUsers = await AsyncStorage.getItem(DEMO_USERS_KEY);
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

  for (const seeded of [
    ...SEEDED_DEMO_USERS,
    ...STORE_TEST_ACCOUNTS,
    ADMIN_TEST_ACCOUNT,
    ...BETA_DESIGNERS,
    ...BETA_CUSTOMERS,
    ...ACCUMULATED_TEST_ACCOUNTS,
  ]) {
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

async function getDemoUsers() {
  return ensureDemoUsersSeeded();
}

async function saveDemoUsers(users: DemoUser[]) {
  await AsyncStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

async function getDemoCurrentUser() {
  const currentUserId = await AsyncStorage.getItem(DEMO_SESSION_KEY);

  if (!currentUserId) {
    return null;
  }

  const users = await getDemoUsers();
  const user = users.find((item) => item.id === currentUserId);
  return user ? toAuthUser(user) : null;
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
    await AsyncStorage.setItem(DEMO_SESSION_KEY, updatedUser.id);

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
  await AsyncStorage.setItem(DEMO_SESSION_KEY, newUser.id);

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

  const users = await getDemoUsers();
  const user = users.find((item) => item.email === normalizedEmail && item.password === password);

  if (!user) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  await AsyncStorage.setItem(DEMO_SESSION_KEY, user.id);
  return toAuthUser(user);
}

export async function getCurrentUser() {
  if (!isDemoAuthMode && supabase) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.user) {
      return null;
    }

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

  return getDemoCurrentUser();
}

export async function signOut() {
  if (!isDemoAuthMode && supabase) {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    return;
  }

  await AsyncStorage.removeItem(DEMO_SESSION_KEY);
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
