import { isLocalAvailable } from '@/lib/local/engine';
import { iosMajor, webgpuAdvice } from '@/lib/local/ua';

export interface Fact {
  label: string;
  value: string;
}

export interface LocalDiagnostics {
  available: boolean;
  detail: string;
  /** Gemessene Werte – zum Vorlesen oder Kopieren, statt zu raten. */
  facts: Fact[];
}

function userAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : '';
}

/** Läuft die Seite als vom Homescreen gestartete App? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const legacy = (window.navigator as { standalone?: boolean }).standalone;
  if (typeof legacy === 'boolean') return legacy;
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  } catch {
    return false;
  }
}

export function localDiagnostics(): LocalDiagnostics {
  const available = isLocalAvailable();
  const ua = userAgent();
  const major = iosMajor(ua);
  const standalone = isStandalone();

  return {
    available,
    detail: webgpuAdvice({ hasGpu: available, ua, standalone }),
    facts: [
      { label: 'navigator.gpu', value: available ? 'vorhanden' : 'fehlt' },
      { label: 'System', value: major !== null ? `iOS ${major}` : 'nicht iOS' },
      { label: 'Gestartet als', value: standalone ? 'App vom Homescreen' : 'Seite im Browser' },
      { label: 'Browserkennung', value: ua || 'unbekannt' },
    ],
  };
}

export interface Probe {
  ok: boolean;
  lines: string[];
}

/**
 * Tiefer Test: Ein vorhandenes `navigator.gpu` heißt noch nicht, dass man
 * einen Adapter bekommt – und WebLLM braucht zusätzlich 16-Bit-Shader.
 * Erst dieser Test sagt verlässlich, ob ein Modell laufen kann.
 */
export async function probeWebGpu(): Promise<Probe> {
  const lines: string[] = [];
  const gpu = (navigator as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;

  if (!gpu) {
    return { ok: false, lines: ['navigator.gpu fehlt – WebGPU ist nicht verfügbar.'] };
  }

  try {
    const adapter = (await gpu.requestAdapter()) as
      | { features?: { has(name: string): boolean }; limits?: Record<string, number> }
      | null;

    if (!adapter) {
      return {
        ok: false,
        lines: ['WebGPU ist da, liefert aber keinen Grafikadapter. Das passiert bei zu wenig Speicher oder nicht unterstützter Hardware.'],
      };
    }

    lines.push('Grafikadapter erhalten.');

    const f16 = adapter.features?.has('shader-f16') ?? false;
    lines.push(f16 ? '16-Bit-Shader: unterstützt.' : '16-Bit-Shader: fehlen – die meisten Modelle brauchen sie.');

    const maxBuffer = adapter.limits?.maxBufferSize;
    if (typeof maxBuffer === 'number') {
      lines.push(`Größter Speicherblock: ${Math.round(maxBuffer / 1024 / 1024)} MB.`);
    }

    return { ok: f16, lines };
  } catch (err) {
    return { ok: false, lines: [`Test fehlgeschlagen: ${err instanceof Error ? err.message : 'unbekannt'}`] };
  }
}
