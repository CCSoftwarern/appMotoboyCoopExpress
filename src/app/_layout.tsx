import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/context/auth';
import {
  configureNotificationHandler,
  useNotificationNavigation,
  useRegisterPushToken,
} from '@/hooks/usePush';
import { Colors } from '@/theme';

configureNotificationHandler();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

function AppGate() {
  useRegisterPushToken();
  useNotificationNavigation();

  const { motoboy, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Protected guard={!!motoboy}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entrega/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!motoboy}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
