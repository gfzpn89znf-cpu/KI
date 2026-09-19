import { deleteModelAllInfoInCache, hasModelInCache, prebuiltAppConfig } from '@mlc-ai/web-llm';

import type { InstalledModel } from '@/lib/local/types';

/**
 * Im Browser gibt es keine Dateien zum Verwalten: WebLLM bringt eine feste
 * Modellliste mit und legt die Gewichte selbst im Cache ab. Deshalb kein
 * Suchen auf Hugging Face, sondern eine kuratierte Auswahl.
 */
export const SUPPORTS_SEARCH = false;

/** Nur Modelle, die auf einem Telefon realistisch laufen. */
const MAX_VRAM_MB = 4200;

/**
 * Oberhalb dieser Grenze wird es auf einem Handy eng: Ein Browser-Tab bekommt
 * dort deutlich weniger Speicher als eine native App, und das Modell muss
 * vollständig hineinpassen.
 */
const TIGHT_FOR_PHONE_MB = 1800;

function friendlyName(modelId: string): string {
  return modelId.replace(/-MLC$/, '').replace(/-q4f(16|32)_1/, '').replace(/_/g, ' ');
}

export interface WebModel extends InstalledModel {
  vramMb: number;
  cached: boolean;
  /** Läuft auf einem Handy vermutlich nicht – zu großer Speicherbedarf. */
  tightForPhone: boolean;
}

function candidates(): WebModel[] {
  return prebuiltAppConfig.model_list
    .filter((record) => (record.vram_required_MB ?? Number.MAX_SAFE_INTEGER) <= MAX_VRAM_MB)
    .filter((record) => (record.model_type ?? 0) === 0)
    .map((record) => ({
      name: friendlyName(record.model_id),
      id: record.model_id,
      // WebLLM meldet Speicherbedarf, keine Dateigröße – als Näherung reicht das.
      size: Math.round((record.vram_required_MB ?? 0) * 1024 * 1024),
      vramMb: record.vram_required_MB ?? 0,
      cached: false,
      tightForPhone: (record.vram_required_MB ?? 0) > TIGHT_FOR_PHONE_MB,
    }))
    .sort((a, b) => a.vramMb - b.vramMb);
}

/** Alle auswählbaren Modelle, mit Vermerk, welche schon im Cache liegen. */
export async function listAvailable(): Promise<WebModel[]> {
  const list = candidates();
  const checked = await Promise.all(
    list.map(async (model) => {
      try {
        return { ...model, cached: await hasModelInCache(model.id) };
      } catch {
        return model;
      }
    }),
  );
  return checked;
}

/**
 * Synchron verfügbar sein muss nur die Liste – ob etwas im Cache liegt, klärt
 * `listAvailable`. Für die Oberfläche genügt hier die reine Auswahl.
 */
export function listInstalled(): InstalledModel[] {
  return candidates();
}

export function findInstalled(name: string | null): InstalledModel | null {
  if (!name) return null;
  return candidates().find((model) => model.name === name || model.id === name) ?? null;
}

export async function deleteModelAsync(id: string): Promise<void> {
  await deleteModelAllInfoInCache(id);
}

export function deleteModel(name: string): void {
  const model = findInstalled(name);
  if (model) void deleteModelAsync(model.id);
}

/** Im Browser verwaltet der Cache den Platz; eine Restmenge lässt sich nicht verlässlich abfragen. */
export function freeSpace(): number {
  return 0;
}

export type { InstalledModel };

/**
 * Im Browser lädt WebLLM die Gewichte selbst beim ersten Start des Modells.
 * Diese Funktion existiert nur, damit Geräte- und Web-Fassung dieselbe
 * Schnittstelle haben – aufgerufen wird sie hier nie (`SUPPORTS_SEARCH` ist false).
 */
export function downloadModel(): never {
  throw new Error('Im Browser werden Modelle beim ersten Start automatisch geladen.');
}
