import type { RNLlamaOAICompatibleMessage } from 'llama.rn';

/** Nachrichtenformat für lokale Modelle – bewusst dasselbe auf Gerät und im Browser. */
export type LocalMessage = RNLlamaOAICompatibleMessage;

export interface LoadOptions {
  /**
   * Was geladen werden soll. Auf dem Gerät ist das der Dateipfad der
   * GGUF-Datei, im Browser die Modell-ID von WebLLM.
   */
  id: string;
  contextSize: number;
  onProgress?(percent: number, note?: string): void;
}

export interface GenerateOptions {
  messages: LocalMessage[];
  maxTokens: number;
  temperature: number;
  signal: AbortSignal;
  onToken(text: string): void;
}

export interface GenerateResult {
  text: string;
  aborted: boolean;
  /** Ausgabegeschwindigkeit in Token pro Sekunde, 0 wenn unbekannt. */
  tokensPerSecond: number;
}

/** Ein Modell, das einsatzbereit auf dem Gerät liegt. */
export interface InstalledModel {
  /** Anzeigename und zugleich ID. */
  name: string;
  /** Was an `ensureModel` übergeben wird. */
  id: string;
  size: number;
}
