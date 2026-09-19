import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Empty, PrimaryButton } from '@/components/ui';
import { getModel } from '@/lib/models';
import { useRuntimeStore } from '@/state/runtime';
import { useAppStore } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

function relativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return new Date(timestamp).toLocaleDateString('de-DE');
}

export default function ConversationListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const order = useAppStore((state) => state.order);
  const conversations = useAppStore((state) => state.conversations);
  const createConversation = useAppStore((state) => state.createConversation);
  const deleteConversation = useAppStore((state) => state.deleteConversation);

  const apiKey = useRuntimeStore((state) => state.apiKey);
  const apiKeyLoaded = useRuntimeStore((state) => state.apiKeyLoaded);

  const items = useMemo(
    () => order.map((id) => conversations[id]).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    [order, conversations],
  );

  function startChat() {
    const id = createConversation();
    router.push(`/chat/${id}`);
  }

  function confirmDelete(id: string, title: string) {
    Alert.alert('Gespräch löschen?', title, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => deleteConversation(id) },
    ]);
  }

  const needsKey = apiKeyLoaded && !apiKey.trim();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={22} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      {needsKey ? (
        <Pressable
          onPress={() => router.push('/settings')}
          style={[styles.banner, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}
        >
          <Ionicons name="key-outline" size={18} color={theme.accent} />
          <Text style={{ color: theme.text, flex: 1, fontSize: 14 }}>
            Noch kein API-Schlüssel hinterlegt. Tippen, um ihn einzutragen.
          </Text>
        </Pressable>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: space.sm, flexGrow: 1 }}
        ListEmptyComponent={
          <Empty
            icon="chatbubbles-outline"
            title="Noch keine Gespräche"
            hint="Tipp unten auf „Neues Gespräch“ und leg los. Alles bleibt auf diesem Gerät."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/chat/${item.id}`)}
            onLongPress={() => confirmDelete(item.id, item.title)}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: theme.border },
              pressed && { backgroundColor: theme.surface },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                {item.title}
              </Text>
              <Text style={{ color: theme.textDim, fontSize: 13, marginTop: 3 }}>
                {getModel(item.model).name} · {relativeDate(item.updatedAt)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textDim} />
          </Pressable>
        )}
      />

      <View style={{ padding: space.lg, paddingBottom: insets.bottom + space.md }}>
        <PrimaryButton title="Neues Gespräch" onPress={startChat} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    margin: space.lg,
    marginBottom: 0,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
