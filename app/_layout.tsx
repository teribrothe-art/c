import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ensureAuthReady } from '../lib/auth';
import { isDemoAuthMode } from '../lib/demo-auth-mode';
import { IronlongSplash } from '../src/components/ironlong-splash';
import { AppScreenShell } from '../src/components/app-screen-shell';
import { AuthSessionBootstrap } from '../src/components/auth-session-bootstrap';
import { ErrorBoundary } from '../src/components/error-boundary';
import { InviteDeepLinkHandler } from '../src/components/invite-deep-link-handler';
import { NetworkStatusBanner } from '../src/components/network-status-banner';

export default function RootLayout() {
  const [isBooting, setIsBooting] = useState(isDemoAuthMode);

  useEffect(() => {
    if (!isDemoAuthMode) {
      setIsBooting(false);
      return;
    }

    void ensureAuthReady().finally(() => setIsBooting(false));
  }, []);

  if (isBooting) {
    return <IronlongSplash message="접속 중..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppScreenShell>
        <SafeAreaProvider>
          <ErrorBoundary>
            <AuthSessionBootstrap />
            <InviteDeepLinkHandler />
            <NetworkStatusBanner />
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </ErrorBoundary>
        </SafeAreaProvider>
      </AppScreenShell>
    </GestureHandlerRootView>
  );
}
