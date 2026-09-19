import { Directory, File, Paths } from 'expo-file-system';

const FOLDER = 'models';

export interface InstalledModel {
  /** Dateiname, dient zugleich als ID. */
  name: string;
  path: string;
  size: number;
}

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
      .map((file) => ({ name: file.name, path: file.uri, size: file.size ?? 0 }))
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
      return { name: fileName, path: target.uri, size: target.size ?? 0 };
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
