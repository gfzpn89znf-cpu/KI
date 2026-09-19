import { DEFAULT_MODEL } from '@/lib/models';
import type { Settings } from '@/state/types';

/** Ausgangszustand der Einstellungen – auch die Grundlage für App-Updates. */
export const DEFAULT_SETTINGS: Settings = {
  backend: 'cloud',
  model: DEFAULT_MODEL,
  localModel: null,
  localContextSize: 4096,
  effort: 'high',
  showThinking: true,
  webSearch: true,
  codeExecution: true,
  memoryEnabled: true,
  speakAnswers: false,
  haptics: true,
  persona: '',
};
