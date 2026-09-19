import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'anthropic_api_key';

/**
 * Der API-Schlüssel liegt in der verschlüsselten Keychain (iOS) bzw. im
 * EncryptedSharedPreferences-Store (Android) – nicht im normalen App-Speicher.
 */
export async function loadApiKey(): Promise<string> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? '';
    return (await SecureStore.getItemAsync(KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function saveApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  try {
    if (Platform.OS === 'web') {
      if (trimmed) globalThis.localStorage?.setItem(KEY, trimmed);
      else globalThis.localStorage?.removeItem(KEY);
      return;
    }
    if (trimmed) await SecureStore.setItemAsync(KEY, trimmed);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Kein Keychain-Zugriff (z. B. Simulator ohne Passcode) – dann bleibt der
    // Schlüssel nur für diese Sitzung im Speicher.
  }
}
