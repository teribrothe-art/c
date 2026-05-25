import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ErrorBoundary } from '../src/components/error-boundary';
import { InviteDeepLinkHandler } from '../src/components/invite-deep-link-handler';
import { NetworkStatusBanner } from '../src/components/network-status-banner';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <InviteDeepLinkHandler />
      <NetworkStatusBanner />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
