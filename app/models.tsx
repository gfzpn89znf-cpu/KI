import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, SectionTitle } from '@/components/ui';
import { confirmAction, notify } from '@/lib/dialog';
import { QUANT_HINT, SUGGESTIONS, type Suggestion } from '@/lib/local/curated';
import {
  deleteModel,
  downloadModel,
  freeSpace,
  listInstalled,
  SUPPORTS_SEARCH,
  type InstalledModel,
} from '@/lib/local/files';
import { formatBytes, listGgufFiles, quantOf, searchRepos, type GgufFile, type RepoSummary } from '@/lib/local/hub';
import { unload } from '@/lib/local/engine';
import { localDiagnostics } from '@/lib/local/diagnostics';
import { useAppStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

interface Progress {
  fileName: string;
  written: number;
  total: number;
  cancel(): void;
}

export default function ModelsScreen() {
  const theme = useTheme();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [installed, setInstalled] = useState<InstalledModel[]>([]);
  const [query, setQuery] = useState('');
  const [repos, setRepos] = useState<RepoSummary[] | null>(null);
  const [openRepo, setOpenRepo] = useState<string | null>(null);
  const [files, setFiles] = useState<GgufFile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const refresh = useCallback(() => setInstalled(listInstalled()), []);
  useEffect(refresh, [refresh]);

  async function search() {
    const term = query.trim();
    if (!term) return;
    setBusy(true);
    setError(null);
    setOpenRepo(null);
    setFiles(null);
    try {
      setRepos(await searchRepos(term));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suche fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  async function openFiles(repoId: string) {
    setBusy(true);
    setError(null);
    setOpenRepo(repoId);
    setFiles(null);
    try {
      const found = await listGgufFiles(repoId);
      setFiles(found);
      if (found.length === 0) setError('In diesem Repository liegen keine passenden GGUF-Dateien.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dateien konnten nicht geladen werden.');
    } finally {
      setBusy(false);
    }
  }

  function startDownload(file: GgufFile) {
    const fileName = file.path.split('/').pop() ?? 'modell.gguf';
    const available = freeSpace();
    if (file.size > 0 && available > 0 && file.size > available - 500 * 1024 ** 2) {
      notify(
        'Zu wenig Speicher',
        `Die Datei braucht ${formatBytes(file.size)}, frei sind ${formatBytes(available)}.`,
      );
      return;
    }

    const handle = downloadModel(file.url, fileName, (written, total) =>
      setProgress((current) => (current ? { ...current, written, total } : current)),
    );
    setProgress({ fileName, written: 0, total: file.size, cancel: handle.cancel });

    handle.promise
      .then((model) => {
        if (!model) return;
        refresh();
        // Frisch geladenes Modell gleich aktivieren – das ist immer die Absicht.
        updateSettings({ localModel: model.name, backend: 'local' });
        notify('Fertig', `${model.name} ist installiert und aktiv.`);
      })
      .catch((err: unknown) =>
        notify('Download fehlgeschlagen', err instanceof Error ? err.message : 'Unbekannter Fehler.'),
      )
      .finally(() => setProgress(null));
  }

  async function confirmDelete(model: InstalledModel) {
    const ok = await confirmAction({
      title: 'Modell löschen?',
      message: `${model.name} (${formatBytes(model.size)})`,
      confirmLabel: 'Löschen',
      destructive: true,
    });
    if (!ok) return;
    if (settings.localModel === model.name) await unload();
    deleteModel(model.name);
    if (settings.localModel === model.name) updateSettings({ localModel: null });
    refresh();
  }

  async function activate(model: InstalledModel) {
    if (settings.localModel !== model.name) await unload();
    updateSettings({ localModel: model.name, backend: 'local' });
  }

  const percent = progress && progress.total > 0 ? progress.written / progress.total : 0;
  const diagnostics = localDiagnostics();
  const nativeReady = diagnostics.available;

  // Im Browser verwaltet WebLLM die Gewichte selbst: keine Suche, keine
  // Dateiauswahl, nur eine feste Liste zum Aktivieren.
  if (!SUPPORTS_SEARCH) {
    return (
      <BrowserModelList
        models={installed}
        activeName={settings.localModel}
        ready={nativeReady}
        detail={diagnostics.detail}
        onActivate={(model) => updateSettings({ localModel: model.name, backend: 'local' })}
        onDelete={(model) => {
          deleteModel(model.name);
          if (settings.localModel === model.name) updateSettings({ localModel: null });
          refresh();
        }}
      />
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl * 2 }}
      keyboardShouldPersistTaps="handled"
      data={files ?? []}
      keyExtractor={(file) => file.path}
      ListHeaderComponent={
        <View>
          {!nativeReady ? (
            <Card style={{ padding: space.lg, marginBottom: space.md, borderColor: theme.accent }}>
              <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>{diagnostics.detail}</Text>
              <Text style={{ color: theme.textDim, fontSize: 13, lineHeight: 19, marginTop: space.sm }}>
                Herunterladen kannst du Modelle trotzdem schon – sie liegen dann bereit.
              </Text>
            </Card>
          ) : null}

          {progress ? (
            <Card style={{ padding: space.lg, marginBottom: space.md }}>
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>
                {progress.fileName}
              </Text>
              <View style={[styles.bar, { backgroundColor: theme.surfaceAlt }]}>
                <View style={[styles.barFill, { backgroundColor: theme.accent, width: `${percent * 100}%` }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm }}>
                <Text style={{ color: theme.textDim, fontSize: 13 }}>
                  {formatBytes(progress.written)}
                  {progress.total > 0 ? ` von ${formatBytes(progress.total)}` : ''}
                </Text>
                <Pressable hitSlop={8} onPress={progress.cancel}>
                  <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '600' }}>Abbrechen</Text>
                </Pressable>
              </View>
            </Card>
          ) : null}

          <SectionTitle>Installiert</SectionTitle>
          <Card>
            {installed.length === 0 ? (
              <Text style={{ color: theme.textDim, fontSize: 14, padding: space.lg, lineHeight: 20 }}>
                Noch kein Modell auf dem Gerät. Such dir unten eins aus – danach läuft die KI ohne Internet.
              </Text>
            ) : (
              installed.map((model, index) => {
                const active = settings.localModel === model.name;
                return (
                  <Pressable
                    key={model.name}
                    onPress={() => void activate(model)}
                    onLongPress={() => void confirmDelete(model)}
                    style={[
                      styles.row,
                      index < installed.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={19}
                      color={active ? theme.accent : theme.textDim}
                    />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15 }}>
                        {model.name}
                      </Text>
                      <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2 }}>
                        {formatBytes(model.size)} · lange tippen zum Löschen
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Card>

          <SectionTitle>Modell holen</SectionTitle>
          <View style={[styles.searchRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search" size={17} color={theme.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void search()}
              returnKeyType="search"
              autoCapitalize="none"
              placeholder="Auf Hugging Face suchen, z. B. qwen3 gguf"
              placeholderTextColor={theme.textDim}
              style={{ flex: 1, color: theme.text, fontSize: 15, paddingVertical: space.sm }}
            />
            {busy ? <ActivityIndicator size="small" color={theme.textDim} /> : null}
          </View>

          {error ? (
            <Text style={{ color: theme.danger, fontSize: 13, marginTop: space.sm }}>{error}</Text>
          ) : null}

          {repos === null ? (
            <View style={{ marginTop: space.md }}>
              {SUGGESTIONS.map((suggestion: Suggestion) => (
                <Pressable
                  key={suggestion.repoId}
                  onPress={() => void openFiles(suggestion.repoId)}
                  style={[styles.suggestion, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{suggestion.name}</Text>
                    <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
                      {suggestion.note}
                    </Text>
                    <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 3 }}>{suggestion.ramHint}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={theme.textDim} />
                </Pressable>
              ))}
              <Text style={{ color: theme.textDim, fontSize: 12, marginTop: space.md, lineHeight: 18 }}>
                {QUANT_HINT}
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: space.md }}>
              {repos.map((repo) => (
                <Pressable
                  key={repo.id}
                  onPress={() => void openFiles(repo.id)}
                  style={[styles.suggestion, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14 }}>
                      {repo.id}
                    </Text>
                    <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 2 }}>
                      {repo.downloads.toLocaleString('de-DE')} Downloads
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={theme.textDim} />
                </Pressable>
              ))}
            </View>
          )}

          {openRepo && files && files.length > 0 ? (
            <>
              <SectionTitle>Dateien in {openRepo}</SectionTitle>
              <Text style={{ color: theme.textDim, fontSize: 12, marginBottom: space.sm, lineHeight: 18 }}>
                {QUANT_HINT}
              </Text>
            </>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => startDownload(item)}
          disabled={progress !== null}
          style={[
            styles.file,
            { backgroundColor: theme.surface, borderColor: theme.border, opacity: progress ? 0.5 : 1 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14 }}>
              {item.path}
            </Text>
            <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 2 }}>
              {quantOf(item.path)} · {formatBytes(item.size)}
            </Text>
          </View>
          <Ionicons name="download-outline" size={19} color={theme.accent} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.sm,
  },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: space.md },
  barFill: { height: 6, borderRadius: 3 },
});

/**
 * Auswahl im Browser. Die Gewichte lädt WebLLM beim ersten Start des Modells
 * selbst herunter und legt sie im Browser-Cache ab – danach läuft alles offline.
 */
function BrowserModelList({
  models,
  activeName,
  ready,
  detail,
  onActivate,
  onDelete,
}: {
  models: InstalledModel[];
  activeName: string | null;
  ready: boolean;
  detail: string;
  onActivate(model: InstalledModel): void;
  onDelete(model: InstalledModel): void;
}) {
  const theme = useTheme();

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl * 2 }}
      data={models}
      keyExtractor={(model) => model.id}
      ListHeaderComponent={
        <View>
          {!ready ? (
            <Card style={{ padding: space.lg, marginBottom: space.md, borderColor: theme.accent }}>
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600', marginBottom: space.xs }}>
                Lokale Modelle gehen hier nicht
              </Text>
              <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>{detail}</Text>
              <Text style={{ color: theme.textDim, fontSize: 13, lineHeight: 19, marginTop: space.sm }}>
                Bis dahin funktioniert die Cloud-Betriebsart ganz normal – dafür brauchst du nur
                einen API-Schlüssel in den Einstellungen.
              </Text>
            </Card>
          ) : null}
          <Text style={{ color: theme.textDim, fontSize: 13, lineHeight: 19, marginBottom: space.md }}>
            Tipp ein Modell an, um es zu aktivieren. Beim ersten Start lädt es einmalig herunter
            (am besten im WLAN) und bleibt danach im Speicher deines Browsers – ab dann läuft es
            ohne Internet. Kleinere Modelle sind schneller und laufen auf mehr Geräten.
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={{ color: theme.textDim, fontSize: 14, lineHeight: 20 }}>
          Für dieses Gerät ist kein passendes Modell dabei.
        </Text>
      }
      renderItem={({ item }) => {
        const active = activeName === item.name;
        return (
          <Pressable
            onPress={() => onActivate(item)}
            onLongPress={() => onDelete(item)}
            disabled={!ready}
            style={[
              styles.suggestion,
              {
                backgroundColor: theme.surface,
                borderColor: active ? theme.accent : theme.border,
                // Nicht auswählbar, wenn das Gerät es ohnehin nicht ausführen kann.
                opacity: ready ? 1 : 0.45,
              },
            ]}
          >
            <Ionicons
              name={active ? 'radio-button-on' : 'radio-button-off'}
              size={19}
              color={active ? theme.accent : theme.textDim}
            />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15 }}>
                {item.name}
              </Text>
              <Text style={{ color: theme.textDim, fontSize: 12, marginTop: 2 }}>
                braucht rund {formatBytes(item.size)} Grafikspeicher · lange tippen zum Entfernen
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}
