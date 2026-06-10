import type { Href } from 'expo-router';

import type { AuthUser } from './auth';
import { getPostAuthRouteForRole } from './auth-redirect';

export const PUBLIC_AUTH_ROUTES = new Set(['/', '/test-login', '/signup', '/scan-invite']);

export const DEV_LAST_ROUTE_KEY = 'hair-diary-dev-last-route';

export function isPublicAuthRoute(pathname: string) {
  return PUBLIC_AUTH_ROUTES.has(pathname);
}

export function readDevLastRoute(): Href | null {
  if (!__DEV__) {
    return null;
  }

  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const raw = sessionStorage.getItem(DEV_LAST_ROUTE_KEY);

  if (!raw || isPublicAuthRoute(raw)) {
    return null;
  }

  return raw as Href;
}

export function saveDevLastRoute(pathname: string) {
  if (!__DEV__) {
    return;
  }

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  if (isPublicAuthRoute(pathname)) {
    return;
  }

  sessionStorage.setItem(DEV_LAST_ROUTE_KEY, pathname);
}

export function resolveSessionRestoreRoute(user: AuthUser, pathname: string): Href | null {
  if (!isPublicAuthRoute(pathname)) {
    return null;
  }

  return readDevLastRoute() ?? getPostAuthRouteForRole(user.role);
}
