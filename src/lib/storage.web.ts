import type { StateStorage } from 'zustand/middleware';

/**
 * Persistenz im Browser. Dateien wie auf dem Gerät gibt es hier nicht, also
 * localStorage – das überlebt auch das Schließen der zum Homescreen
 * hinzugefügten App.
 *
 * Achtung: localStorage ist auf wenige Megabyte begrenzt. Deshalb werden
 * Bild-Anhänge im Verlauf ohnehin früh bereinigt (siehe store.ts).
 */
const KEY = 'ki-app-store';

export const fileStorage: StateStorage = {
  getItem: async (): Promise<string | null> => {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      globalThis.localStorage?.setItem(KEY, value);
    } catch (err) {
      console.warn('Speichern fehlgeschlagen (Speicher voll?):', err);
    }
  },
  removeItem: async (): Promise<void> => {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      // Nicht kritisch.
    }
  },
};

export function flushStorage(): void {
  // localStorage schreibt sofort – nichts zu tun.
}
