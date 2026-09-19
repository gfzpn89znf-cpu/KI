import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadApiKey } from '@/lib/secure';
import { flushStorage } from '@/lib/storage';
import { useRuntimeStore } from '@/state/runtime';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const theme = useTheme();

  useEffect(() => {
    // Der Schlüssel liegt in der Keychain und wird erst beim Start geladen.
    loadApiKey().then((key) => {
      const runtime = useRuntimeStore.getState();
      runtime.setApiKey(key);
      runtime.markApiKeyLoaded();
    });
  }, []);

  useEffect(() => {
    // Beim Wechsel in den Hintergrund sofort speichern, statt auf den Timer zu warten.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') flushStorage();
    });
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaProvider>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.text,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'KI' }} />
          <Stack.Screen name="chat/[id]" options={{ title: '' }} />
          <Stack.Screen name="settings" options={{ title: 'Einstellungen' }} />
          <Stack.Screen name="memory" options={{ title: 'Gedächtnis' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
