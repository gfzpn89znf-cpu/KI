import { File, Paths } from 'expo-file-system';
import type { StateStorage } from 'zustand/middleware';

const FILE_NAME = 'ki-store.json';
const WRITE_DELAY_MS = 400;

function storeFile(): File {
  return new File(Paths.document, FILE_NAME);
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingValue: string | null = null;

function flush(): void {
  if (pendingValue === null) return;
  const value = pendingValue;
  pendingValue = null;
  try {
    const file = storeFile();
    if (!file.exists) file.create({ intermediates: true, overwrite: true });
    file.write(value);
  } catch (err) {
    console.warn('Speichern fehlgeschlagen:', err);
  }
}

/**
 * Persistenz über eine JSON-Datei im Dokumentenordner der App. Bewusst nicht
 * AsyncStorage: dessen Android-Datenbank ist standardmäßig auf 6 MB begrenzt,
 * und Bild-Anhänge im Verlauf sprengen das schnell.
 *
 * Schreibvorgänge werden gebündelt, damit nicht jeder Token eines Streams
 * eine Datei-Operation auslöst.
 */
export const fileStorage: StateStorage = {
  getItem: async (): Promise<string | null> => {
    try {
      const file = storeFile();
      if (!file.exists) return null;
      return await file.text();
    } catch (err) {
      console.warn('Laden fehlgeschlagen:', err);
      return null;
    }
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    pendingValue = value;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, WRITE_DELAY_MS);
  },
  removeItem: async (): Promise<void> => {
    pendingValue = null;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = null;
    try {
      const file = storeFile();
      if (file.exists) file.delete();
    } catch (err) {
      console.warn('Löschen fehlgeschlagen:', err);
    }
  },
};

/** Sofort schreiben, z. B. bevor die App in den Hintergrund geht. */
export function flushStorage(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  flush();
}
