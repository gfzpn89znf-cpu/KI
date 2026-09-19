import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Empty } from '@/components/ui';
import { useAppStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

export default function MemoryScreen() {
  const theme = useTheme();
  const memory = useAppStore((state) => state.memory);
  const remember = useAppStore((state) => state.remember);
  const forget = useAppStore((state) => state.forget);
  const clearMemory = useAppStore((state) => state.clearMemory);

  const [draft, setDraft] = useState('');

  function add() {
    const fact = draft.trim();
    if (!fact) return;
    remember(fact);
    setDraft('');
  }

  function confirmClear() {
    Alert.alert('Alles vergessen?', 'Die KI weiß danach nichts mehr über dich.', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Alles löschen', style: 'destructive', onPress: clearMemory },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.adder, { borderBottomColor: theme.border }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Etwas ergänzen, das deine KI wissen soll"
          placeholderTextColor={theme.textDim}
          onSubmitEditing={add}
          returnKeyType="done"
          style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
        />
        <Pressable hitSlop={8} onPress={add} style={[styles.add, { backgroundColor: theme.accent }]}>
          <Ionicons name="add" size={20} color={theme.accentText} />
        </Pressable>
      </View>

      <FlatList
        data={memory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, paddingVertical: space.sm }}
        ListEmptyComponent={
          <Empty
            icon="bookmark-outline"
            title="Noch nichts gemerkt"
            hint="Deine KI speichert hier von selbst, was über ein einzelnes Gespräch hinaus wichtig ist. Du kannst auch selbst etwas eintragen."
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <Text style={{ color: theme.text, fontSize: 15, flex: 1, lineHeight: 21 }}>{item.fact}</Text>
            <Pressable hitSlop={10} onPress={() => forget(item.id)}>
              <Ionicons name="trash-outline" size={18} color={theme.textDim} />
            </Pressable>
          </View>
        )}
      />

      {memory.length > 0 ? (
        <Pressable onPress={confirmClear} style={{ padding: space.lg, alignItems: 'center' }}>
          <Text style={{ color: theme.danger, fontSize: 15 }}>Alles vergessen</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  adder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    fontSize: 15,
  },
  add: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
