import { Platform } from 'react-native';

import { isLocalAvailable } from '@/lib/local/engine';

export interface Fact {
  label: string;
  value: string;
}

export interface LocalDiagnostics {
  available: boolean;
  detail: string;
  facts: Fact[];
}

export interface Probe {
  ok: boolean;
  lines: string[];
}

/**
 * Auf dem Gerät entscheidet der native llama-Teil. Das Gegenstück für den
 * Browser (`diagnostics.web.ts`) misst stattdessen WebGPU.
 */
export function localDiagnostics(): LocalDiagnostics {
  const available = isLocalAvailable();
  return {
    available,
    detail: available
      ? 'Lokale Modelle sind einsatzbereit.'
      : 'Der native llama-Teil fehlt – das ist normal in Expo Go. In einer richtig gebauten App ist er dabei.',
    facts: [
      { label: 'Plattform', value: Platform.OS },
      { label: 'Nativer Teil', value: available ? 'vorhanden' : 'fehlt' },
    ],
  };
}

export async function probeWebGpu(): Promise<Probe> {
  const available = isLocalAvailable();
  return {
    ok: available,
    lines: [available ? 'Nativer llama-Teil geladen.' : 'Kein nativer llama-Teil vorhanden.'],
  };
}
