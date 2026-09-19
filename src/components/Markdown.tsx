import * as Clipboard from 'expo-clipboard';
import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { parseBlocks, parseInline, type Block } from '@/lib/markdown';
import { radius, space, useTheme, type Theme } from '@/theme';

function Inline({ source, theme, size }: { source: string; theme: Theme; size: number }) {
  const segments = parseInline(source);
  return (
    <Text style={{ color: theme.text, fontSize: size, lineHeight: size * 1.5 }}>
      {segments.map((segment, index) => {
        if (segment.href) {
          return (
            <Text
              key={index}
              style={{ color: theme.accent, textDecorationLine: 'underline' }}
              onPress={() => {
                Linking.openURL(segment.href as string).catch(() => undefined);
              }}
            >
              {segment.text}
            </Text>
          );
        }
        return (
          <Text
            key={index}
            style={[
              segment.bold && { fontWeight: '700' },
              segment.italic && { fontStyle: 'italic' },
              segment.code && {
                fontFamily: 'monospace',
                fontSize: size - 1,
                color: theme.accent,
                backgroundColor: theme.codeBg,
              },
            ]}
          >
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
}

function CodeBlock({ block, theme }: { block: Extract<Block, { kind: 'code' }>; theme: Theme }) {
  return (
    <View style={[styles.code, { backgroundColor: theme.codeBg, borderColor: theme.border }]}>
      <View style={styles.codeHeader}>
        <Text style={{ color: theme.textDim, fontSize: 12 }}>{block.language || 'Code'}</Text>
        <Pressable
          hitSlop={8}
          onPress={() => {
            Clipboard.setStringAsync(block.code).catch(() => undefined);
          }}
        >
          <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>Kopieren</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text selectable style={{ color: theme.text, fontFamily: 'monospace', fontSize: 13, lineHeight: 19 }}>
          {block.code}
        </Text>
      </ScrollView>
    </View>
  );
}

export function Markdown({ source, size = 16 }: { source: string; size?: number }) {
  const theme = useTheme();
  const blocks = useMemo(() => parseBlocks(source), [source]);

  return (
    <View>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'code':
            return <CodeBlock key={index} block={block} theme={theme} />;

          case 'heading': {
            const fontSize = size + Math.max(0, 5 - block.level) * 2;
            return (
              <Text
                key={index}
                style={{ color: theme.text, fontSize, fontWeight: '700', marginTop: space.md, marginBottom: space.xs }}
              >
                {block.text}
              </Text>
            );
          }

          case 'bullet':
          case 'ordered':
            return (
              <View key={index} style={{ marginVertical: space.xs }}>
                {block.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.listRow}>
                    <Text style={{ color: theme.textDim, fontSize: size, lineHeight: size * 1.5, width: 22 }}>
                      {block.kind === 'bullet' ? '•' : `${itemIndex + 1}.`}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Inline source={item} theme={theme} size={size} />
                    </View>
                  </View>
                ))}
              </View>
            );

          case 'quote':
            return (
              <View key={index} style={[styles.quote, { borderLeftColor: theme.accent }]}>
                <Inline source={block.text} theme={theme} size={size} />
              </View>
            );

          case 'rule':
            return <View key={index} style={{ height: 1, backgroundColor: theme.border, marginVertical: space.md }} />;

          default:
            return (
              <View key={index} style={{ marginVertical: space.xs }}>
                <Inline source={block.text} theme={theme} size={size} />
              </View>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  code: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.md,
    marginVertical: space.sm,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  quote: { borderLeftWidth: 3, paddingLeft: space.md, marginVertical: space.sm },
});
