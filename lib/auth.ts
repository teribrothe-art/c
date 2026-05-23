import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from './supabase';

export type UserRole = 'customer' | 'designer';

export type AuthUser = {
  id: string;
  email: string;
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

export const isDemoAuthMode = !isSupabaseConfigured || !supabase;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toAuthUser(user: DemoUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
  };
}

async function getDemoUsers() {
  const rawUsers = await AsyncStorage.getItem(DEMO_USERS_KEY);
  return rawUsers ? (JSON.parse(rawUsers) as DemoUser[]) : [];
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
    };
  }

  const users = await getDemoUsers();
  const existingUser = users.find((item) => item.email === normalizedEmail);

  if (existingUser) {
    throw new Error('이미 가입된 이메일입니다.');
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

    return {
      id: data.user.id,
      email: data.user.email ?? normalizedEmail,
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
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email ?? '이메일 정보 없음',
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
