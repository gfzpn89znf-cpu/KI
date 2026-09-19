import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { localDiagnostics, probeWebGpu, type Probe } from '@/lib/local/diagnostics';
import { radius, space, useTheme } from '@/theme';

/**
 * Zeigt, was auf diesem Gerät tatsächlich gemessen wurde – statt einer
 * pauschalen Vermutung. Der tiefe Test läuft erst auf Knopfdruck, weil er
 * einen Grafikadapter anfordert.
 */
export function Diagnostics() {
  const theme = useTheme();
  const info = localDiagnostics();
  const [probe, setProbe] = useState<Probe | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setRunning(true);
    try {
      setProbe(await probeWebGpu());
    } catch (err) {
      setProbe({ ok: false, lines: [err instanceof Error ? err.message : 'Test fehlgeschlagen.'] });
    } finally {
      setRunning(false);
    }
  }

  function copy() {
    const text = [
      info.available ? 'Lokale Modelle: verfügbar' : 'Lokale Modelle: nicht verfügbar',
      ...info.facts.map((fact) => `${fact.label}: ${fact.value}`),
      ...(probe ? ['— Tiefer Test —', ...probe.lines] : []),
      '— Einschätzung —',
      info.detail,
    ].join('\n');
    Clipboard.setStringAsync(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card style={{ padding: space.lg, marginTop: space.md }}>
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>Was dieses Gerät meldet</Text>

      <View style={{ marginTop: space.md, gap: space.sm }}>
        {info.facts.map((fact) => (
          <View key={fact.label}>
            <Text style={{ color: theme.textDim, fontSize: 12 }}>{fact.label}</Text>
            <Text selectable style={{ color: theme.text, fontSize: 13, lineHeight: 18 }}>
              {fact.value}
            </Text>
          </View>
        ))}
      </View>

      {probe ? (
        <View style={[styles.probe, { borderTopColor: theme.border }]}>
          {probe.lines.map((line, index) => (
            <Text key={index} style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
        <Pressable
          onPress={() => void run()}
          disabled={running}
          style={[styles.button, { borderColor: theme.border, opacity: running ? 0.5 : 1 }]}
        >
          {running ? (
            <ActivityIndicator size="small" color={theme.textDim} />
          ) : (
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>Genauer prüfen</Text>
          )}
        </Pressable>

        <Pressable onPress={copy} style={[styles.button, { borderColor: theme.border }]}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={theme.textDim} />
          <Text style={{ color: theme.textDim, fontSize: 13 }}>{copied ? 'Kopiert' : 'Kopieren'}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  probe: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: space.md, paddingTop: space.md, gap: space.xs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
});
