import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../src/components/error-boundary';
import { InviteDeepLinkHandler } from '../src/components/invite-deep-link-handler';
import { NetworkStatusBanner } from '../src/components/network-status-banner';
import { isDemoAuthMode } from '../lib/demo-auth-mode';
import { prefetchDemoWorkspaceStorage } from '../lib/demo-async-storage';

export default function RootLayout() {
  useEffect(() => {
    if (isDemoAuthMode) {
      void prefetchDemoWorkspaceStorage();
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <InviteDeepLinkHandler />
          <NetworkStatusBanner />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
