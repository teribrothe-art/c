import type { Href } from 'expo-router';

import { getCurrentUser } from './auth';

export async function getPostAuthRoute(): Promise<Href> {
  const user = await getCurrentUser();

  if (!user) {
    return '/';
  }

  if (user.role === 'designer') {
    return '/designer/home' as Href;
  }

  if (user.role === 'store') {
    return '/store';
  }

  if (user.role === 'admin') {
    return '/admin';
  }

  return '/customer-home';
}
