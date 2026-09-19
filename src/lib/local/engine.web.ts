import * as webllm from '@mlc-ai/web-llm';

import type { GenerateOptions, GenerateResult, LoadOptions } from '@/lib/local/types';

/**
 * Lokale Ausführung im Browser über WebGPU (WebLLM). Gleiche Schnittstelle wie
 * `engine.ts` auf dem Gerät – der restliche Code merkt den Unterschied nicht.
 *
 * Das Modell wird einmal heruntergeladen und vom Browser zwischengespeichert;
 * danach läuft alles offline auf der GPU des Telefons.
 */

let engine: webllm.MLCEngine | null = null;
let loadedId: string | null = null;
let loading: Promise<webllm.MLCEngine> | null = null;

export function isLocalAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export const LOCAL_UNAVAILABLE_HINT =
  'Dieser Browser kann keine Modelle ausführen (WebGPU fehlt). Auf dem iPhone brauchst du iOS 18 oder neuer und Safari; auf dem Rechner einen aktuellen Chrome, Edge oder Safari.';

export function loadedModelId(): string | null {
  return loadedId;
}

export async function ensureModel(options: LoadOptions): Promise<void> {
  if (!isLocalAvailable()) throw new Error(LOCAL_UNAVAILABLE_HINT);
  if (engine && loadedId === options.id) return;
  if (loading) await loading.catch(() => undefined);
  if (engine && loadedId === options.id) return;

  await unload();

  loading = webllm.CreateMLCEngine(options.id, {
    initProgressCallback: (report: webllm.InitProgressReport) => {
      options.onProgress?.(Math.round((report.progress ?? 0) * 100), report.text);
    },
  });

  try {
    engine = await loading;
    loadedId = options.id;
  } finally {
    loading = null;
  }
}

export async function unload(): Promise<void> {
  const current = engine;
  engine = null;
  loadedId = null;
  if (current) {
    try {
      await current.unload();
    } catch {
      // Beim Entladen ist ein Fehler folgenlos.
    }
  }
}

export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const current = engine;
  if (!current) throw new Error('Es ist kein lokales Modell geladen.');

  let text = '';
  let stopped = false;

  const onAbort = () => {
    stopped = true;
    current.interruptGenerate();
  };
  options.signal.addEventListener('abort', onAbort);

  try {
    const stream = await current.chat.completions.create({
      // WebLLM erwartet dieselben Rollen wie die OpenAI-API.
      messages: options.messages as webllm.ChatCompletionMessageParam[],
      stream: true,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    for await (const chunk of stream) {
      if (stopped) break;
      const piece = chunk.choices[0]?.delta?.content ?? '';
      if (!piece) continue;
      text += piece;
      options.onToken(piece);
    }

    return { text, aborted: stopped, tokensPerSecond: 0 };
  } finally {
    options.signal.removeEventListener('abort', onAbort);
  }
}
