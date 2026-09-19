import { Directory, File, Paths } from 'expo-file-system';

import type { InstalledModel } from '@/lib/local/types';

const FOLDER = 'models';

function modelsDir(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function listInstalled(): InstalledModel[] {
  try {
    return modelsDir()
      .list()
      .filter((entry): entry is File => entry instanceof File && entry.name.toLowerCase().endsWith('.gguf'))
      .map((file) => ({ name: file.name, id: file.uri, size: file.size ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export function findInstalled(name: string | null): InstalledModel | null {
  if (!name) return null;
  return listInstalled().find((model) => model.name === name) ?? null;
}

export function deleteModel(name: string): void {
  const file = new File(modelsDir(), name);
  if (file.exists) file.delete();
}

/** Auf dem Gerät gibt es echte Dateien, die man suchen und laden muss. */
export const SUPPORTS_SEARCH = true;

/** Freier Speicherplatz auf dem Gerät in Bytes. */
export function freeSpace(): number {
  try {
    return Paths.availableDiskSpace;
  } catch {
    return 0;
  }
}

export interface DownloadHandle {
  promise: Promise<InstalledModel | null>;
  cancel(): void;
}

/**
 * Lädt eine GGUF-Datei in den Modellordner. Ein Teil-Download wird beim
 * Abbruch entfernt, damit keine unbrauchbare Datei zurückbleibt.
 */
export function downloadModel(
  url: string,
  fileName: string,
  onProgress: (written: number, total: number) => void,
): DownloadHandle {
  const controller = new AbortController();
  const target = new File(modelsDir(), fileName);

  const promise = (async () => {
    try {
      await File.downloadFileAsync(url, target, {
        idempotent: true,
        signal: controller.signal,
        onProgress: ({ bytesWritten, totalBytes }) => onProgress(bytesWritten, totalBytes),
      });
      return { name: fileName, id: target.uri, size: target.size ?? 0 };
    } catch (err) {
      try {
        if (target.exists) target.delete();
      } catch {
        // Aufräumen ist Kür – der eigentliche Fehler zählt.
      }
      if (controller.signal.aborted) return null;
      throw err;
    }
  })();

  return { promise, cancel: () => controller.abort() };
}

export type { InstalledModel };
