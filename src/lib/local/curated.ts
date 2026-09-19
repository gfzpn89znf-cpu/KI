/**
 * Startpunkte für die Modellsuche. Bewusst nur Repository-Namen, keine
 * Dateilinks: Die App löst die konkreten Dateien live auf (siehe hub.ts).
 */
export interface Suggestion {
  repoId: string;
  name: string;
  note: string;
  /** Grober Anhaltspunkt für nötigen Arbeitsspeicher. */
  ramHint: string;
}

export const SUGGESTIONS: Suggestion[] = [
  {
    repoId: 'Qwen/Qwen3-4B-GGUF',
    name: 'Qwen3 4B',
    note: 'Bestes Verhältnis aus Größe und Können. Gutes Deutsch.',
    ramHint: 'ab 8 GB RAM',
  },
  {
    repoId: 'ggml-org/gemma-3-4b-it-GGUF',
    name: 'Gemma 3 4B',
    note: 'Von Google, sehr flüssige Texte.',
    ramHint: 'ab 8 GB RAM',
  },
  {
    repoId: 'bartowski/Llama-3.2-3B-Instruct-GGUF',
    name: 'Llama 3.2 3B',
    note: 'Etwas kleiner, solide für Alltagsfragen.',
    ramHint: 'ab 6 GB RAM',
  },
  {
    repoId: 'Qwen/Qwen3-1.7B-GGUF',
    name: 'Qwen3 1.7B',
    note: 'Läuft auch auf älteren Geräten, merklich einfacher gestrickt.',
    ramHint: 'ab 4 GB RAM',
  },
];

/** Empfehlung, welche Quantisierung man nehmen sollte. */
export const QUANT_HINT =
  'Nimm Q4_K_M, wenn es sie gibt: bester Kompromiss aus Qualität und Platz. Q8 ist besser, aber doppelt so groß; Q3 spart Platz und macht mehr Fehler.';
