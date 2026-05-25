import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ErrorBoundary } from '../src/components/error-boundary';
import { NetworkStatusBanner } from '../src/components/network-status-banner';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <NetworkStatusBanner />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
