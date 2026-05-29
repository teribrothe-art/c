import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { getCurrentUser } from './auth';
import type { OrgScope } from './org-access';

export function useOrgRoleGuard(requiredRole: OrgScope) {

  useFocusEffect(
    useCallback(() => {
      getCurrentUser().then((user) => {
        if (!user) {
          router.replace('/');
          return;
        }

        if (user.role !== requiredRole) {
          router.replace('/');
        }
      });
    }, [requiredRole]),
  );
}
