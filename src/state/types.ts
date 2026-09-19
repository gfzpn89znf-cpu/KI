import type Anthropic from '@anthropic-ai/sdk';
import type { Effort, ModelId } from '@/lib/models';

export interface MemoryItem {
  id: string;
  fact: string;
  createdAt: number;
}

export interface Settings {
  model: ModelId;
  effort: Effort;
  showThinking: boolean;
  webSearch: boolean;
  codeExecution: boolean;
  memoryEnabled: boolean;
  speakAnswers: boolean;
  haptics: boolean;
  /** Freitext, der zusätzlich in den Systemprompt wandert. */
  persona: string;
}

export interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: ModelId;
  /**
   * Der API-Verlauf ist die einzige Wahrheit: Die Oberfläche wird daraus
   * abgeleitet. Dadurch geht beim Fortsetzen eines Gesprächs nichts verloren
   * (Denkblöcke, Werkzeug-Ergebnisse, Anhänge bleiben erhalten).
   */
  messages: Anthropic.MessageParam[];
  usage: UsageTotals;
  /** Fehlermeldung des letzten Versuchs, falls er fehlschlug. */
  lastError?: string;
}

export const DEFAULT_USAGE: UsageTotals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
