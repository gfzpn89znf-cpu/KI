import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PressRow, PrimaryButton, SectionTitle, ToggleRow } from '@/components/ui';
import { listInstalled } from '@/lib/local/files';
import { MODELS, type Effort } from '@/lib/models';
import { saveApiKey } from '@/lib/secure';
import { useRuntimeStore } from '@/state/runtime';
import { useAppStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];
const EFFORT_LABEL: Record<Effort, string> = {
  low: 'schnell',
  medium: 'normal',
  high: 'gründlich',
  xhigh: 'sehr gründlich',
  max: 'maximal',
};

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const memory = useAppStore((state) => state.memory);

  const apiKey = useRuntimeStore((state) => state.apiKey);
  const setApiKey = useRuntimeStore((state) => state.setApiKey);

  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [keyVisible, setKeyVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [persona, setPersona] = useState(settings.persona);
  const localModels = listInstalled();

  useEffect(() => setKeyDraft(apiKey), [apiKey]);

  async function storeKey() {
    await saveApiKey(keyDraft);
    setApiKey(keyDraft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function cycleEffort() {
    const index = EFFORTS.indexOf(settings.effort);
    updateSettings({ effort: EFFORTS[(index + 1) % EFFORTS.length] });
  }

  function chooseModel() {
    Alert.alert('Standardmodell', 'Gilt für neue Gespräche.', [
      ...MODELS.map((model) => ({
        text: `${model.name}${model.id === settings.model ? '  ✓' : ''}`,
        onPress: () => updateSettings({ model: model.id }),
      })),
      { text: 'Abbrechen', style: 'cancel' as const },
    ]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl * 2 }}
      keyboardShouldPersistTaps="handled"
    >
      <SectionTitle>Betriebsart</SectionTitle>
      <Card>
        <Pressable
          onPress={() => updateSettings({ backend: 'local' })}
          style={[styles.choice, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
        >
          <Ionicons
            name={settings.backend === 'local' ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={settings.backend === 'local' ? theme.accent : theme.textDim}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Auf dem Gerät</Text>
            <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
              Kostenlos und ohne Internet. Nichts verlässt das Handy. Deutlich einfacher gestrickt
              als die Cloud-Modelle.
            </Text>
            <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 4 }}>
              {settings.localModel ?? (localModels.length > 0 ? 'Kein Modell ausgewählt' : 'Noch kein Modell geladen')}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={() => updateSettings({ backend: 'cloud' })} style={styles.choice}>
          <Ionicons
            name={settings.backend === 'cloud' ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={settings.backend === 'cloud' ? theme.accent : theme.textDim}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Über die Cloud</Text>
            <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
              Volle Stärke mit Websuche, Bildern und PDFs. Kostet pro Anfrage und geht an
              Anthropic.
            </Text>
          </View>
        </Pressable>
      </Card>

      <Card style={{ marginTop: space.sm }}>
        <PressRow
          label="Lokale Modelle"
          hint={localModels.length === 0 ? 'Modell herunterladen' : `${localModels.length} installiert`}
          onPress={() => router.push('/models')}
          last
        />
      </Card>

      <SectionTitle>API-Schlüssel</SectionTitle>
      <Card style={{ padding: space.lg }}>
        <View style={[styles.keyRow, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
          <TextInput
            value={keyDraft}
            onChangeText={setKeyDraft}
            placeholder="sk-ant-…"
            placeholderTextColor={theme.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!keyVisible}
            style={{ flex: 1, color: theme.text, fontSize: 15, paddingVertical: space.sm }}
          />
          <Pressable hitSlop={8} onPress={() => setKeyVisible((value) => !value)}>
            <Ionicons name={keyVisible ? 'eye-off-outline' : 'eye-outline'} size={19} color={theme.textDim} />
          </Pressable>
        </View>

        <Text style={{ color: theme.textDim, fontSize: 13, lineHeight: 19, marginTop: space.sm }}>
          Der Schlüssel wird verschlüsselt auf dem Gerät gespeichert (Keychain bzw. Android Keystore) und
          nur an die Anthropic-API geschickt.
        </Text>

        <View style={{ marginTop: space.md }}>
          <PrimaryButton title={saved ? 'Gespeichert' : 'Speichern'} onPress={() => void storeKey()} />
        </View>

        <Pressable
          onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys').catch(() => undefined)}
          style={{ marginTop: space.md, alignSelf: 'center' }}
        >
          <Text style={{ color: theme.accent, fontSize: 14 }}>Schlüssel in der Anthropic Console holen</Text>
        </Pressable>
      </Card>

      <SectionTitle>Modell</SectionTitle>
      <Card>
        <PressRow
          label="Standardmodell"
          hint="Für neue Gespräche"
          value={MODELS.find((m) => m.id === settings.model)?.name}
          onPress={chooseModel}
        />
        <PressRow
          label="Denktiefe"
          hint="Mehr Tiefe heißt bessere Antworten, aber langsamer und teurer"
          value={EFFORT_LABEL[settings.effort]}
          onPress={cycleEffort}
          last
        />
      </Card>

      <SectionTitle>Fähigkeiten</SectionTitle>
      <Text style={{ color: theme.textDim, fontSize: 12, marginBottom: space.sm, lineHeight: 18 }}>
        Gilt nur für die Cloud-Betriebsart. Ein lokales Modell hat kein Internet und keine Werkzeuge.
      </Text>
      <Card>
        <ToggleRow
          label="Websuche"
          hint="Darf im Internet nachschlagen und Seiten lesen"
          value={settings.webSearch}
          onChange={(value) => updateSettings({ webSearch: value })}
        />
        <ToggleRow
          label="Code ausführen"
          hint="Rechnet und wertet Daten in einer Sandbox aus"
          value={settings.codeExecution}
          onChange={(value) => updateSettings({ codeExecution: value })}
        />
        <ToggleRow
          label="Gedächtnis"
          hint="Merkt sich Dinge über dich – gesprächsübergreifend"
          value={settings.memoryEnabled}
          onChange={(value) => updateSettings({ memoryEnabled: value })}
        />
        <ToggleRow
          label="Gedankengang zeigen"
          hint="Blendet eine Zusammenfassung der Überlegungen ein"
          value={settings.showThinking}
          onChange={(value) => updateSettings({ showThinking: value })}
          last
        />
      </Card>

      <SectionTitle>Verhalten</SectionTitle>
      <Card style={{ padding: space.lg }}>
        <Text style={{ color: theme.text, fontSize: 16 }}>Eigene Anweisungen</Text>
        <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
          Wie soll dich deine KI ansprechen, worauf soll sie achten? Gilt für alle Gespräche.
        </Text>
        <TextInput
          value={persona}
          onChangeText={setPersona}
          onBlur={() => updateSettings({ persona })}
          multiline
          placeholder="z. B. Antworte knapp. Duze mich. Ich bin Entwickler und mag Beispiele in TypeScript."
          placeholderTextColor={theme.textDim}
          style={[
            styles.persona,
            { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt },
          ]}
        />
      </Card>

      <SectionTitle>Sonstiges</SectionTitle>
      <Card>
        <ToggleRow
          label="Antworten vorlesen"
          hint="Liest jede fertige Antwort automatisch vor"
          value={settings.speakAnswers}
          onChange={(value) => updateSettings({ speakAnswers: value })}
        />
        <ToggleRow
          label="Haptisches Feedback"
          value={settings.haptics}
          onChange={(value) => updateSettings({ haptics: value })}
        />
        <PressRow
          label="Gespeichertes Wissen"
          hint={memory.length === 0 ? 'Noch nichts gemerkt' : `${memory.length} Einträge`}
          onPress={() => router.push('/memory')}
          last
        />
      </Card>

      <Text style={{ color: theme.textDim, fontSize: 12, textAlign: 'center', marginTop: space.xl, lineHeight: 18 }}>
        Gespräche und Gedächtnis liegen ausschließlich auf diesem Gerät.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  choice: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
  },
  persona: {
    marginTop: space.md,
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: space.md,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
});
