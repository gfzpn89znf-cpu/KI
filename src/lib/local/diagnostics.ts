/**
 * Auskunft darüber, warum lokale Modelle auf diesem Gerät gehen oder nicht.
 * Auf dem Gerät entscheidet der native Teil, im Browser WebGPU – siehe
 * `diagnostics.web.ts`.
 */
import { Platform } from 'react-native';

import { isLocalAvailable } from '@/lib/local/engine';

export interface LocalDiagnostics {
  available: boolean;
  /** Eine Zeile, die man jemandem vorlesen kann. */
  detail: string;
}

export function localDiagnostics(): LocalDiagnostics {
  const available = isLocalAvailable();
  return {
    available,
    detail: available
      ? `Native App auf ${Platform.OS} – lokale Modelle einsatzbereit.`
      : `Native App auf ${Platform.OS}, aber der llama-Teil fehlt (typisch für Expo Go).`,
  };
}
