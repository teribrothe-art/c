import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="home" />
        <Stack.Screen name="my" />
        <Stack.Screen name="ai" />
        <Stack.Screen name="analysis" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="treatment/[id]" />
        <Stack.Screen name="payment/[treatmentId]" />
        <Stack.Screen name="payment/receipt/[id]" />
        <Stack.Screen name="customer/payments" />
        <Stack.Screen name="designer/clients" />
        <Stack.Screen name="designer/treatment/[id]" />
        <Stack.Screen name="designer/revenue" />
        <Stack.Screen name="designer/input" />
        <Stack.Screen name="designer/my" />
      </Stack>
    </>
  );
}
