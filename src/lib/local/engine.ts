import { TurboModuleRegistry } from 'react-native';
import { initLlama, type LlamaContext, type TokenData } from 'llama.rn';

import type { GenerateOptions, GenerateResult, LoadOptions } from '@/lib/local/types';

/**
 * Lokale Ausführung auf dem Gerät über llama.cpp.
 *
 * Die Gegenstücke für den Browser stehen in `engine.web.ts` und bieten
 * dieselbe Schnittstelle – der übrige Code kennt den Unterschied nicht.
 */

let context: LlamaContext | null = null;
let loadedId: string | null = null;
let loading: Promise<LlamaContext> | null = null;

/**
 * Lokale Modelle brauchen nativen Code. In Expo Go ist der nicht dabei, deshalb
 * hier eine klare Auskunft statt eines kryptischen Absturzes weiter unten.
 * `TurboModuleRegistry.get` liefert null statt zu werfen – der Import der
 * Bibliothek bleibt also auch ohne nativen Teil harmlos.
 */
export function isLocalAvailable(): boolean {
  try {
    return TurboModuleRegistry.get('RNLlama') != null;
  } catch {
    return false;
  }
}

export const LOCAL_UNAVAILABLE_HINT =
  'Lokale Modelle brauchen eine richtig installierte App. In Expo Go fehlt der native Teil – nimm solange die Web-Version oder die Cloud-Betriebsart.';

export function loadedModelId(): string | null {
  return loadedId;
}

export async function ensureModel(options: LoadOptions): Promise<void> {
  if (!isLocalAvailable()) throw new Error(LOCAL_UNAVAILABLE_HINT);
  if (context && loadedId === options.id) return;
  if (loading) await loading.catch(() => undefined);
  if (context && loadedId === options.id) return;

  await unload();

  loading = initLlama(
    {
      model: options.id,
      n_ctx: options.contextSize,
      // Auf dem Handy rechnet die GPU (Metal bzw. OpenCL) deutlich schneller.
      n_gpu_layers: 99,
    },
    (percent) => options.onProgress?.(percent),
  );

  try {
    context = await loading;
    loadedId = options.id;
  } finally {
    loading = null;
  }
}

export async function unload(): Promise<void> {
  const current = context;
  context = null;
  loadedId = null;
  if (current) {
    try {
      await current.release();
    } catch {
      // Beim Entladen ist ein Fehler folgenlos – der Kontext ist so oder so weg.
    }
  }
}

export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const ctx = context;
  if (!ctx) throw new Error('Es ist kein lokales Modell geladen.');

  let text = '';
  let stopped = false;

  const onAbort = () => {
    stopped = true;
    ctx.stopCompletion().catch(() => undefined);
  };
  options.signal.addEventListener('abort', onAbort);

  try {
    const result = await ctx.completion(
      {
        messages: options.messages,
        n_predict: options.maxTokens,
        temperature: options.temperature,
        // Jinja nutzt die im Modell hinterlegte Chat-Vorlage – ohne das
        // antwortet ein Instruct-Modell oft im falschen Format.
        jinja: true,
      },
      (data: TokenData) => {
        if (stopped) return;
        const piece = data.token ?? '';
        if (!piece) return;
        text += piece;
        options.onToken(piece);
      },
    );

    return {
      text: text || result.text || '',
      aborted: stopped,
      tokensPerSecond: result.timings?.predicted_per_second ?? 0,
    };
  } finally {
    options.signal.removeEventListener('abort', onAbort);
  }
}
