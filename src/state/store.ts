import type Anthropic from '@anthropic-ai/sdk';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { newId } from '@/lib/ids';
import { type ModelId } from '@/lib/models';
import { fileStorage } from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/state/defaults';
import { DEFAULT_USAGE, type Conversation, type MemoryItem, type Settings, type UsageTotals } from '@/state/types';

/** So viele Anhänge behalten ihre Rohdaten im gespeicherten Verlauf. */
const KEEP_ATTACHMENTS = 4;

interface AppState {
  conversations: Record<string, Conversation>;
  order: string[];
  memory: MemoryItem[];
  settings: Settings;

  createConversation(model?: ModelId): string;
  deleteConversation(id: string): void;
  renameConversation(id: string, title: string): void;
  appendMessages(id: string, messages: Anthropic.MessageParam[]): void;
  addUsage(id: string, usage: UsageTotals): void;
  setError(id: string, error?: string): void;
  setConversationModel(id: string, model: ModelId): void;
  /** Entfernt die letzte Nutzer-Nachricht und alles danach (für "nochmal versuchen"). */
  rewindToLastUser(id: string): Anthropic.MessageParam | null;

  remember(fact: string): MemoryItem;
  forget(id: string): boolean;
  clearMemory(): void;

  updateSettings(patch: Partial<Settings>): void;
}

function titleFrom(message: Anthropic.MessageParam): string {
  const content = message.content;
  if (typeof content === 'string') return trimTitle(content);
  for (const block of content) {
    if (block.type === 'text') return trimTitle(block.text);
  }
  return 'Neues Gespräch';
}

function trimTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Neues Gespräch';
  return clean.length > 48 ? `${clean.slice(0, 47)}…` : clean;
}

/**
 * Hält den gespeicherten Verlauf klein: Bilder und PDFs älterer Nachrichten
 * verlieren ihre Rohdaten und werden durch einen Hinweis ersetzt. Der Text des
 * Gesprächs bleibt vollständig erhalten.
 */
function pruneAttachments(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  let budget = KEEP_ATTACHMENTS;
  const result: Anthropic.MessageParam[] = [];

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (typeof message.content === 'string') {
      result.unshift(message);
      continue;
    }

    let changed = false;
    const blocks: Anthropic.ContentBlockParam[] = [];

    for (const block of message.content) {
      const isAttachment = block.type === 'image' || block.type === 'document';
      if (!isAttachment) {
        blocks.push(block);
        continue;
      }
      if (budget > 0) {
        budget -= 1;
        blocks.push(block);
        continue;
      }
      changed = true;
      const label = block.type === 'image' ? 'Bild' : 'Dokument';
      blocks.push({ type: 'text', text: `[${label} aus dem gespeicherten Verlauf entfernt, um Platz zu sparen]` });
    }

    result.unshift(changed ? { ...message, content: blocks } : message);
  }

  return result;
}

function touch(conversation: Conversation, messages: Anthropic.MessageParam[]): Conversation {
  const next: Conversation = {
    ...conversation,
    messages: pruneAttachments(messages),
    updatedAt: Date.now(),
  };
  if (conversation.title === 'Neues Gespräch') {
    const firstUser = messages.find((m) => m.role === 'user');
    if (firstUser) next.title = titleFrom(firstUser);
  }
  return next;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      conversations: {},
      order: [],
      memory: [],
      settings: DEFAULT_SETTINGS,

      createConversation(model) {
        const id = newId('c');
        const now = Date.now();
        const conversation: Conversation = {
          id,
          title: 'Neues Gespräch',
          createdAt: now,
          updatedAt: now,
          model: model ?? get().settings.model,
          messages: [],
          usage: { ...DEFAULT_USAGE },
        };
        set((state) => ({
          conversations: { ...state.conversations, [id]: conversation },
          order: [id, ...state.order],
        }));
        return id;
      },

      deleteConversation(id) {
        set((state) => {
          const conversations = { ...state.conversations };
          delete conversations[id];
          return { conversations, order: state.order.filter((x) => x !== id) };
        });
      },

      renameConversation(id, title) {
        set((state) => {
          const conversation = state.conversations[id];
          if (!conversation) return state;
          return {
            conversations: {
              ...state.conversations,
              [id]: { ...conversation, title: trimTitle(title), updatedAt: Date.now() },
            },
          };
        });
      },

      appendMessages(id, messages) {
        if (messages.length === 0) return;
        set((state) => {
          const conversation = state.conversations[id];
          if (!conversation) return state;
          const updated = touch(conversation, [...conversation.messages, ...messages]);
          return {
            conversations: { ...state.conversations, [id]: updated },
            order: [id, ...state.order.filter((x) => x !== id)],
          };
        });
      },

      addUsage(id, usage) {
        set((state) => {
          const conversation = state.conversations[id];
          if (!conversation) return state;
          return {
            conversations: {
              ...state.conversations,
              [id]: {
                ...conversation,
                usage: {
                  input: conversation.usage.input + usage.input,
                  output: conversation.usage.output + usage.output,
                  cacheRead: conversation.usage.cacheRead + usage.cacheRead,
                  cacheWrite: conversation.usage.cacheWrite + usage.cacheWrite,
                },
              },
            },
          };
        });
      },

      setError(id, error) {
        set((state) => {
          const conversation = state.conversations[id];
          if (!conversation) return state;
          return {
            conversations: { ...state.conversations, [id]: { ...conversation, lastError: error } },
          };
        });
      },

      setConversationModel(id, model) {
        set((state) => {
          const conversation = state.conversations[id];
          if (!conversation) return state;
          return { conversations: { ...state.conversations, [id]: { ...conversation, model } } };
        });
      },

      rewindToLastUser(id) {
        const conversation = get().conversations[id];
        if (!conversation) return null;

        // Die letzte echte Nutzer-Nachricht suchen (Werkzeug-Ergebnisse zählen nicht).
        let index = -1;
        for (let i = conversation.messages.length - 1; i >= 0; i -= 1) {
          const message = conversation.messages[i];
          if (message.role !== 'user') continue;
          const isToolResult =
            Array.isArray(message.content) && message.content.every((b) => b.type === 'tool_result');
          if (!isToolResult) {
            index = i;
            break;
          }
        }
        if (index < 0) return null;

        const removed = conversation.messages[index];
        set((state) => ({
          conversations: {
            ...state.conversations,
            [id]: {
              ...conversation,
              messages: conversation.messages.slice(0, index),
              lastError: undefined,
              updatedAt: Date.now(),
            },
          },
        }));
        return removed;
      },

      remember(fact) {
        const item: MemoryItem = { id: newId('m'), fact, createdAt: Date.now() };
        set((state) => ({ memory: [...state.memory, item] }));
        return item;
      },

      forget(id) {
        const exists = get().memory.some((m) => m.id === id);
        if (exists) set((state) => ({ memory: state.memory.filter((m) => m.id !== id) }));
        return exists;
      },

      clearMemory() {
        set({ memory: [] });
      },

      updateSettings(patch) {
        set((state) => ({ settings: { ...state.settings, ...patch } }));
      },
    }),
    {
      name: 'ki-app',
      version: 1,
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        order: state.order,
        memory: state.memory,
        settings: state.settings,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...saved,
          // Neue Einstellungen aus einem App-Update ergänzen, statt sie zu verlieren.
          settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
        };
      },
    },
  ),
);

export function useConversation(id: string | undefined): Conversation | undefined {
  return useAppStore((state) => (id ? state.conversations[id] : undefined));
}

export { DEFAULT_SETTINGS };
