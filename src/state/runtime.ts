import { create } from 'zustand';

export interface StreamState {
  active: boolean;
  text: string;
  thinking: string;
  /** Zuletzt angestoßene Werkzeuge, als Statuszeile. */
  tools: string[];
}

const EMPTY: StreamState = { active: false, text: '', thinking: '', tools: [] };

interface RuntimeState {
  /** Laufende Antworten je Gespräch – bewusst nicht gespeichert. */
  streams: Record<string, StreamState>;
  apiKey: string;
  apiKeyLoaded: boolean;

  setApiKey(key: string): void;
  markApiKeyLoaded(): void;
  patchStream(id: string, patch: Partial<StreamState>): void;
  appendStream(id: string, patch: { text?: string; thinking?: string; tool?: string }): void;
  resetStream(id: string): void;
}

export const useRuntimeStore = create<RuntimeState>()((set) => ({
  streams: {},
  apiKey: '',
  apiKeyLoaded: false,

  setApiKey(key) {
    set({ apiKey: key });
  },

  markApiKeyLoaded() {
    set({ apiKeyLoaded: true });
  },

  patchStream(id, patch) {
    set((state) => ({
      streams: { ...state.streams, [id]: { ...(state.streams[id] ?? EMPTY), ...patch } },
    }));
  },

  appendStream(id, patch) {
    set((state) => {
      const current = state.streams[id] ?? EMPTY;
      return {
        streams: {
          ...state.streams,
          [id]: {
            ...current,
            text: patch.text ? current.text + patch.text : current.text,
            thinking: patch.thinking ? current.thinking + patch.thinking : current.thinking,
            tools: patch.tool ? [...current.tools, patch.tool] : current.tools,
          },
        },
      };
    });
  },

  resetStream(id) {
    set((state) => {
      const streams = { ...state.streams };
      delete streams[id];
      return { streams };
    });
  },
}));

export function useStream(id: string | undefined): StreamState {
  return useRuntimeStore((state) => (id ? (state.streams[id] ?? EMPTY) : EMPTY));
}

const controllers = new Map<string, AbortController>();

export function beginRun(id: string): AbortController {
  controllers.get(id)?.abort();
  const controller = new AbortController();
  controllers.set(id, controller);
  return controller;
}

export function endRun(id: string): void {
  controllers.delete(id);
}

export function stopRun(id: string): void {
  controllers.get(id)?.abort();
  controllers.delete(id);
}

export function isRunning(id: string): boolean {
  return controllers.has(id);
}
