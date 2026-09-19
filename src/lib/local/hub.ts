/**
 * Nachschlagen von GGUF-Modellen auf Hugging Face – zur Laufzeit, vom Handy aus.
 *
 * Bewusst keine fest eingebauten Download-Links: Dateinamen von Quantisierungen
 * ändern sich, Repos werden umbenannt. Die App fragt stattdessen live nach,
 * damit ein Link nicht Monate später ins Leere läuft.
 */

const API = 'https://huggingface.co/api';

export interface RepoSummary {
  id: string;
  downloads: number;
  likes: number;
}

export interface GgufFile {
  repoId: string;
  /** Dateiname im Repo, z. B. "Qwen3-4B-Q4_K_M.gguf". */
  path: string;
  /** Größe in Bytes, 0 wenn unbekannt. */
  size: number;
  url: string;
}

function downloadUrl(repoId: string, path: string): string {
  return `${API.replace('/api', '')}/${repoId}/resolve/main/${encodeURI(path)}?download=true`;
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'Nicht gefunden. Stimmt der Name des Repositorys?'
        : `Hugging Face antwortet mit ${response.status}.`,
    );
  }
  return response.json();
}

/** Sucht Repositorys, die GGUF-Dateien enthalten. */
export async function searchRepos(query: string, signal?: AbortSignal): Promise<RepoSummary[]> {
  const params = new URLSearchParams({
    search: query,
    filter: 'gguf',
    sort: 'downloads',
    direction: '-1',
    limit: '25',
  });
  const data = await getJson(`${API}/models?${params.toString()}`, signal);
  if (!Array.isArray(data)) return [];

  return data
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        id: typeof item.id === 'string' ? item.id : '',
        downloads: typeof item.downloads === 'number' ? item.downloads : 0,
        likes: typeof item.likes === 'number' ? item.likes : 0,
      };
    })
    .filter((repo) => repo.id.length > 0);
}

/**
 * Listet die GGUF-Dateien eines Repositorys mit Größe.
 * Mehrteilige Modelle (…-00001-of-00003.gguf) werden ausgeblendet: llama.rn lädt
 * eine einzelne Datei, und geteilte Modelle sind für ein Handy ohnehin zu groß.
 */
export async function listGgufFiles(repoId: string, signal?: AbortSignal): Promise<GgufFile[]> {
  const data = await getJson(`${API}/models/${repoId}/tree/main?recursive=true`, signal);
  if (!Array.isArray(data)) return [];

  const files: GgufFile[] = [];
  for (const entry of data) {
    const item = entry as Record<string, unknown>;
    const path = typeof item.path === 'string' ? item.path : '';
    if (!path.toLowerCase().endsWith('.gguf')) continue;
    if (/-\d{5}-of-\d{5}\.gguf$/i.test(path)) continue;

    const lfs = item.lfs as Record<string, unknown> | undefined;
    const size =
      typeof lfs?.size === 'number' ? lfs.size : typeof item.size === 'number' ? item.size : 0;

    files.push({ repoId, path, size, url: downloadUrl(repoId, path) });
  }

  // Kleinste zuerst – auf dem Handy ist das fast immer die richtige Wahl.
  return files.sort((a, b) => a.size - b.size);
}

/** Erkennt die Quantisierung im Dateinamen, z. B. "Q4_K_M". */
export function quantOf(path: string): string {
  const match = path.match(/(IQ\d[_A-Z0-9]*|Q\d[_A-Z0-9]*|BF16|F16|F32)/i);
  return match ? match[1].toUpperCase() : '–';
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return 'unbekannt';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}
