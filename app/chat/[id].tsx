import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chooser, type ChooserOption } from '@/components/Chooser';
import { Composer } from '@/components/Composer';
import { MessageBubble } from '@/components/MessageBubble';
import { Empty } from '@/components/ui';
import type { PickedAttachment } from '@/lib/attachments';
import { localDiagnostics } from '@/lib/local/diagnostics';
import { listInstalled } from '@/lib/local/files';
import { estimateCost, getModel, MODELS } from '@/lib/models';
import { deriveItems, type ChatItem } from '@/lib/render';
import { retryLast, sendMessage } from '@/state/chat';
import { stopRun, useRuntimeStore, useStream } from '@/state/runtime';
import { useAppStore, useConversation } from '@/state/store';
import { radius, space, useTheme } from '@/theme';

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;

  const conversation = useConversation(id);
  const settings = useAppStore((state) => state.settings);
  const setConversationModel = useAppStore((state) => state.setConversationModel);
  const setConversationBackend = useAppStore((state) => state.setConversationBackend);
  const setError = useAppStore((state) => state.setError);
  const apiKey = useRuntimeStore((state) => state.apiKey);
  const stream = useStream(id);

  const listRef = useRef<FlatList<ChatItem>>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const items = useMemo(() => {
    const base = conversation ? deriveItems(conversation.messages) : [];
    if (!stream.active) return base;
    return [
      ...base,
      {
        key: 'live',
        role: 'assistant' as const,
        text: stream.text,
        thinking: stream.thinking,
        // Nur die letzten Werkzeug-Meldungen zeigen, sonst wächst die Liste endlos.
        tools: stream.tools.slice(-4),
        pending: true,
      },
    ];
  }, [conversation, stream]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    if (items.length > 0) scrollToEnd();
  }, [items.length, scrollToEnd]);

  // Während des Streams seltener scrollen – sonst ruckelt die Liste bei jedem Token.
  useEffect(() => {
    if (!stream.active) return;
    const timer = setInterval(() => listRef.current?.scrollToEnd({ animated: false }), 600);
    return () => clearInterval(timer);
  }, [stream.active]);

  if (!conversation) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}>
        <Empty icon="alert-circle-outline" title="Gespräch nicht gefunden" hint="Es wurde vermutlich gelöscht." />
      </View>
    );
  }

  const model = getModel(conversation.model);
  const cost = estimateCost(model, conversation.usage);
  const isLocal = conversation.backend === 'local';
  const local = localDiagnostics();
  // Gespräch steht auf „lokal", das Gerät kann es aber nicht – das muss vor dem
  // Abschicken auffallen, nicht danach.
  const localBlocked = isLocal && !local.available;

  // Auswahl aus Cloud-Modellen und dem lokalen Modell.
  type Choice = { kind: 'local' } | { kind: 'cloud'; model: (typeof MODELS)[number]['id'] };

  const localName = settings.localModel;
  const hasLocal = localName !== null && listInstalled().some((m) => m.name === localName);

  const choices: ChooserOption<Choice>[] = [
    {
      value: { kind: 'local' },
      label: 'Auf dem Gerät',
      hint: !local.available
        ? 'Auf diesem Gerät nicht verfügbar'
        : hasLocal
          ? `${localName} · kostenlos, ohne Internet`
          : 'Noch kein Modell geladen – hier tippen zum Einrichten',
      selected: isLocal,
    },
    ...MODELS.map((option) => ({
      value: { kind: 'cloud' as const, model: option.id },
      label: `Cloud · ${option.name}`,
      hint: option.tagline,
      selected: !isLocal && option.id === conversation.model,
    })),
  ];

  function applyChoice(choice: Choice) {
    if (choice.kind === 'local') {
      if (!local.available) router.push('/models');
      else if (hasLocal) setConversationBackend(id, 'local');
      else router.push('/models');
      return;
    }
    setConversationBackend(id, 'cloud');
    setConversationModel(id, choice.model);
  }

  function handleSend(text: string, attachments: PickedAttachment[]) {
    void sendMessage({ conversationId: id, text, attachments });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <Stack.Screen
        options={{
          title: conversation.title,
          headerTitleStyle: { fontWeight: '700', fontSize: 16 },
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={21} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <Pressable onPress={() => setPickerOpen(true)} style={[styles.modelBar, { borderBottomColor: theme.border }]}>
        <Ionicons
          name={isLocal ? 'phone-portrait-outline' : 'cloud-outline'}
          size={13}
          color={isLocal ? theme.accent : theme.textDim}
        />
        <Text numberOfLines={1} style={{ color: theme.textDim, fontSize: 13, maxWidth: '70%' }}>
          {isLocal
            ? (settings.localModel ?? 'Kein Modell geladen')
            : `${model.name}${model.supportsEffort ? ` · Tiefe: ${settings.effort}` : ''}`}
        </Text>
        <Ionicons name="chevron-down" size={13} color={theme.textDim} />
        {!isLocal && cost > 0 ? (
          <Text style={{ color: theme.textDim, fontSize: 13, marginLeft: 'auto' }}>
            ≈ {cost < 0.01 ? '<0,01' : cost.toFixed(2)} $
          </Text>
        ) : null}
        {isLocal ? (
          <Text style={{ color: theme.textDim, fontSize: 13, marginLeft: 'auto' }}>offline</Text>
        ) : null}
      </Pressable>

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingVertical: space.md, flexGrow: 1 }}
        keyboardDismissMode="interactive"
        onContentSizeChange={scrollToEnd}
        ListEmptyComponent={
          <Empty
            icon="sparkles-outline"
            title="Leg los"
            hint={
              isLocal
                ? 'Läuft komplett auf deinem Handy. Kein Internet, keine Kosten.'
                : apiKey.trim()
                  ? 'Frag nach irgendwas, häng ein Foto oder PDF an, oder lass im Netz nachschauen.'
                  : 'Trag zuerst in den Einstellungen deinen API-Schlüssel ein.'
            }
          />
        }
        renderItem={({ item }) => <MessageBubble item={item} showThinking={settings.showThinking} />}
        ListFooterComponent={
          stream.active && !stream.text ? (
            <View style={styles.pending}>
              <ActivityIndicator size="small" color={theme.textDim} />
              <Text style={{ color: theme.textDim, fontSize: 13 }}>
                {stream.tools.length > 0 ? stream.tools[stream.tools.length - 1] : 'Denkt nach …'}
              </Text>
            </View>
          ) : null
        }
      />

      {localBlocked ? (
        <View style={[styles.error, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}>
          <Ionicons name="information-circle-outline" size={17} color={theme.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 13, lineHeight: 18 }}>
              Dieses Gespräch steht auf „auf dem Gerät", aber {local.detail.charAt(0).toLowerCase() + local.detail.slice(1)}
            </Text>
          </View>
          <Pressable
            hitSlop={8}
            onPress={() => {
              setConversationBackend(id, 'cloud');
              setError(id, undefined);
            }}
          >
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>Zur Cloud</Text>
          </Pressable>
        </View>
      ) : null}

      {conversation.lastError ? (
        <Pressable
          onPress={() => setError(id, undefined)}
          style={[styles.error, { backgroundColor: theme.surfaceAlt, borderColor: theme.danger }]}
        >
          <Ionicons name="warning-outline" size={17} color={theme.danger} />
          <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{conversation.lastError}</Text>
          <Pressable hitSlop={8} onPress={() => void retryLast(id)}>
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>Nochmal</Text>
          </Pressable>
        </Pressable>
      ) : null}

      <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : space.md }}>
        <Composer
          busy={stream.active}
          hapticsEnabled={settings.haptics}
          onSend={handleSend}
          onStop={() => stopRun(id)}
        />
      </View>
      <Chooser
        visible={pickerOpen}
        title="Modell wählen"
        subtitle="Gilt für dieses Gespräch."
        options={choices}
        onSelect={applyChoice}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  modelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
