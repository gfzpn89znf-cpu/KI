import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chooser, type ChooserOption } from '@/components/Chooser';
import { pickDocument, pickFromCamera, pickFromLibrary, type PickedAttachment } from '@/lib/attachments';
import { notify } from '@/lib/dialog';
import { radius, space, useTheme } from '@/theme';

interface Props {
  busy: boolean;
  hapticsEnabled: boolean;
  onSend(text: string, attachments: PickedAttachment[]): void;
  onStop(): void;
}

type Source = 'camera' | 'library' | 'document';

export function Composer({ busy, hapticsEnabled, onSend, onStop }: Props) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [picking, setPicking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const canSend = !busy && (text.trim().length > 0 || attachments.length > 0);

  async function attach(source: Source) {
    setPicking(true);
    try {
      const picked =
        source === 'camera'
          ? await pickFromCamera()
          : source === 'library'
            ? await pickFromLibrary()
            : await pickDocument();
      if (picked) setAttachments((current) => [...current, picked]);
    } catch (err) {
      notify('Anhang nicht möglich', err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setPicking(false);
    }
  }

  const attachOptions: ChooserOption<Source>[] = [
    { value: 'camera', label: 'Foto aufnehmen' },
    { value: 'library', label: 'Aus der Galerie' },
    { value: 'document', label: 'PDF auswählen' },
  ];

  function handleSend() {
    if (!canSend) return;
    if (hapticsEnabled) {
      // Im Browser gibt es kein haptisches Feedback – niemals den Versand daran scheitern lassen.
      try {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      } catch {
        // egal
      }
    }
    onSend(text, attachments);
    setText('');
    setAttachments([]);
  }

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
      {attachments.length > 0 ? (
        <View style={styles.attachments}>
          {attachments.map((attachment, index) => (
            <View key={index} style={[styles.chip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Ionicons
                name={attachment.kind === 'image' ? 'image-outline' : 'document-text-outline'}
                size={14}
                color={theme.textDim}
              />
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, maxWidth: 140 }}>
                {attachment.name}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => setAttachments((current) => current.filter((_, i) => i !== index))}
              >
                <Ionicons name="close" size={15} color={theme.textDim} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable hitSlop={8} onPress={() => setMenuOpen(true)} disabled={picking} style={styles.iconButton}>
          <Ionicons name="add" size={24} color={picking ? theme.border : theme.textDim} />
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Frag mich was …"
          placeholderTextColor={theme.textDim}
          multiline
          style={[styles.input, { color: theme.text }]}
        />

        {busy ? (
          <Pressable hitSlop={8} onPress={onStop} style={[styles.send, { backgroundColor: theme.surfaceAlt }]}>
            <Ionicons name="stop" size={17} color={theme.text} />
          </Pressable>
        ) : (
          <Pressable
            hitSlop={8}
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.send, { backgroundColor: canSend ? theme.accent : theme.surfaceAlt }]}
          >
            <Ionicons name="arrow-up" size={19} color={canSend ? theme.accentText : theme.textDim} />
          </Pressable>
        )}
      </View>

      <Chooser
        visible={menuOpen}
        title="Anhang"
        subtitle="Was möchtest du anhängen?"
        options={attachOptions}
        onSelect={(source) => void attach(source)}
        onClose={() => setMenuOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.md, paddingTop: space.sm },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs + 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingLeft: space.xs,
    paddingRight: space.xs,
    paddingVertical: space.xs,
  },
  iconButton: { padding: space.sm },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 140,
    paddingTop: Platform.OS === 'ios' ? space.sm + 2 : space.sm,
    paddingBottom: space.sm,
    paddingHorizontal: space.xs,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    margin: space.xs,
  },
});
