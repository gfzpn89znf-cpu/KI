import { TurboModuleRegistry } from 'react-native';
import { initLlama, type LlamaContext, type RNLlamaOAICompatibleMessage, type TokenData } from 'llama.rn';

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
  'Lokale Modelle brauchen eine richtig installierte App. In Expo Go fehlt der native Teil – siehe README, Abschnitt „Aufs iPhone bekommen".';

/**
 * Hält genau einen geladenen Modell-Kontext. Ein Handy hat nicht den Speicher
 * für zwei gleichzeitig, deshalb wird beim Wechsel der alte freigegeben.
 */
let context: LlamaContext | null = null;
let loadedPath: string | null = null;
let loading: Promise<LlamaContext> | null = null;

export interface LoadOptions {
  path: string;
  contextSize: number;
  onProgress?(percent: number): void;
}

export function loadedModelPath(): string | null {
  return loadedPath;
}

export async function ensureModel(options: LoadOptions): Promise<LlamaContext> {
  if (!isLocalAvailable()) throw new Error(LOCAL_UNAVAILABLE_HINT);
  if (context && loadedPath === options.path) return context;
  if (loading) await loading.catch(() => undefined);
  if (context && loadedPath === options.path) return context;

  await unload();

  loading = initLlama(
    {
      model: options.path,
      n_ctx: options.contextSize,
      // Auf dem Handy rechnet die GPU (Metal bzw. OpenCL) deutlich schneller.
      n_gpu_layers: 99,
    },
    (percent) => options.onProgress?.(percent),
  );

  try {
    context = await loading;
    loadedPath = options.path;
    return context;
  } finally {
    loading = null;
  }
}

export async function unload(): Promise<void> {
  const current = context;
  context = null;
  loadedPath = null;
  if (current) {
    try {
      await current.release();
    } catch {
      // Beim Entladen ist ein Fehler folgenlos – der Kontext ist so oder so weg.
    }
  }
}

export interface GenerateOptions {
  messages: RNLlamaOAICompatibleMessage[];
  maxTokens: number;
  temperature: number;
  signal: AbortSignal;
  onToken(text: string): void;
}

export interface GenerateResult {
  text: string;
  aborted: boolean;
  /** Token pro Sekunde bei der Ausgabe, für die Anzeige. */
  tokensPerSecond: number;
}

export async function generate(
  ctx: LlamaContext,
  options: GenerateOptions,
): Promise<GenerateResult> {
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

    const perSecond = result.timings?.predicted_per_second ?? 0;
    return { text: text || result.text || '', aborted: stopped, tokensPerSecond: perSecond };
  } finally {
    options.signal.removeEventListener('abort', onAbort);
  }
}
