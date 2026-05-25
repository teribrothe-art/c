import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCurrentUser, isDemoAuthMode } from './auth';
import { toAppError } from './errors';
import { supabase } from './supabase';

const DEMO_USERS_KEY = 'hair-diary-demo-users';
const AVATAR_KEY_PREFIX = 'hair-diary-profile-avatar';

function avatarStorageKey(userId: string) {
  return `${AVATAR_KEY_PREFIX}-${userId}`;
}

export async function getProfileAvatarUri(userId: string) {
  return AsyncStorage.getItem(avatarStorageKey(userId));
}

export async function saveProfileAvatarUri(userId: string, uri: string | null) {
  if (!uri) {
    await AsyncStorage.removeItem(avatarStorageKey(userId));
    return;
  }

  await AsyncStorage.setItem(avatarStorageKey(userId), uri);
}

export async function updateProfileName(name: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }

  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error('이름을 입력해주세요.');
  }

  if (isDemoAuthMode || !supabase) {
    const raw = await AsyncStorage.getItem(DEMO_USERS_KEY);
    const users = raw ? (JSON.parse(raw) as { id: string; email: string; name: string | null; role: string; password?: string }[]) : [];
    const index = users.findIndex((item) => item.id === user.id);

    if (index >= 0) {
      users[index] = { ...users[index], name: trimmed };
      await AsyncStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
    }

    return { id: user.id, name: trimmed };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    throw toAppError(error);
  }

  return { id: user.id, name: trimmed };
}

export async function updateProfile(input: { name: string; avatarUri?: string | null }) {
  const result = await updateProfileName(input.name);

  if (input.avatarUri !== undefined) {
    await saveProfileAvatarUri(result.id, input.avatarUri);
  }

  return result;
}
