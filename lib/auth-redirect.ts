import type { Href } from 'expo-router';

import { getCurrentUser } from './auth';
import type { UserRole } from './user-role';

export function getPostAuthRouteForRole(role?: UserRole | null): Href {
  if (role === 'designer') {
    return '/designer/home' as Href;
  }

  if (role === 'store') {
    return '/store';
  }

  if (role === 'admin') {
    return '/admin';
  }

  return '/customer-home';
}

export async function getPostAuthRoute(): Promise<Href> {
  const user = await getCurrentUser();

  if (!user) {
    return '/';
  }

  return getPostAuthRouteForRole(user.role);
}
