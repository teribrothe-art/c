import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../src/components/error-boundary';
import { InviteDeepLinkHandler } from '../src/components/invite-deep-link-handler';
import { NetworkStatusBanner } from '../src/components/network-status-banner';

if (__DEV__) {
  LogBox.ignoreLogs([
    '[Reanimated] Reduced motion setting is enabled on this device',
    'Cannot connect to Expo CLI',
  ]);
}

export default function RootLayout() {
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
