import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Markdown } from '@/components/Markdown';
import type { ChatItem } from '@/lib/render';
import { radius, space, useTheme } from '@/theme';

function ToolStrip({ tools }: { tools: string[] }) {
  const theme = useTheme();
  if (tools.length === 0) return null;

  return (
    <View style={{ gap: space.xs, marginBottom: space.sm }}>
      {tools.map((tool, index) => (
        <View key={index} style={[styles.tool, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Ionicons name="sparkles-outline" size={13} color={theme.accent} />
          <Text numberOfLines={2} style={{ color: theme.textDim, fontSize: 13, flex: 1 }}>
            {tool}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Thinking({ text }: { text: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (!text.trim()) return null;

  return (
    <View style={{ marginBottom: space.sm }}>
      <Pressable onPress={() => setOpen((value) => !value)} hitSlop={6} style={styles.thinkingHeader}>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={14} color={theme.textDim} />
        <Text style={{ color: theme.textDim, fontSize: 13, fontStyle: 'italic' }}>Gedankengang</Text>
      </Pressable>
      {open ? (
        <View style={[styles.thinkingBody, { borderLeftColor: theme.border }]}>
          <Text style={{ color: theme.textDim, fontSize: 14, lineHeight: 20 }}>{text.trim()}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function MessageBubble({ item, showThinking }: { item: ChatItem; showThinking: boolean }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  if (item.role === 'user') {
    return (
      <View style={styles.userWrap}>
        <View style={[styles.userBubble, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          {item.attachments.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: item.text ? space.sm : 0 }}>
              {item.attachments.map((attachment, index) => (
                <View key={index} style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons
                    name={attachment.kind === 'image' ? 'image-outline' : 'document-text-outline'}
                    size={13}
                    color={theme.textDim}
                  />
                  <Text numberOfLines={1} style={{ color: theme.textDim, fontSize: 12, maxWidth: 160 }}>
                    {attachment.name}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {item.text ? <Text selectable style={{ color: theme.text, fontSize: 16, lineHeight: 23 }}>{item.text}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantWrap}>
      {showThinking ? <Thinking text={item.thinking} /> : null}
      <ToolStrip tools={item.tools} />
      <Markdown source={item.text} />

      {!item.pending && item.text.trim() ? (
        <View style={styles.actions}>
          <Pressable
            hitSlop={8}
            style={styles.action}
            onPress={() => {
              Clipboard.setStringAsync(item.text).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={15} color={theme.textDim} />
            <Text style={{ color: theme.textDim, fontSize: 12 }}>{copied ? 'Kopiert' : 'Kopieren'}</Text>
          </Pressable>
          <Pressable
            hitSlop={8}
            style={styles.action}
            onPress={() => {
              Speech.stop();
              Speech.speak(item.text.replace(/[`*#>_~]/g, '').slice(0, 4000), { language: 'de-DE' });
            }}
          >
            <Ionicons name="volume-medium-outline" size={15} color={theme.textDim} />
            <Text style={{ color: theme.textDim, fontSize: 12 }}>Vorlesen</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userWrap: { alignItems: 'flex-end', paddingHorizontal: space.lg, marginVertical: space.sm },
  userBubble: {
    maxWidth: '88%',
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.md,
  },
  assistantWrap: { paddingHorizontal: space.lg, marginVertical: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs + 1,
  },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs + 2,
  },
  thinkingHeader: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  thinkingBody: { borderLeftWidth: 2, paddingLeft: space.md, marginTop: space.xs },
  actions: { flexDirection: 'row', gap: space.lg, marginTop: space.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
