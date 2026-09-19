import type Anthropic from '@anthropic-ai/sdk';
import * as Speech from 'expo-speech';

import { toContentBlock, type PickedAttachment } from '@/lib/attachments';
import { describeError, runAgent, type MemoryOps } from '@/lib/claude';
import { useAppStore } from '@/state/store';
import { beginRun, endRun, useRuntimeStore } from '@/state/runtime';

export interface SendInput {
  conversationId: string;
  text: string;
  attachments: PickedAttachment[];
}

function buildUserMessage(input: SendInput): Anthropic.MessageParam {
  const blocks: Anthropic.ContentBlockParam[] = input.attachments.map(toContentBlock);
  const text = input.text.trim();
  if (text) blocks.push({ type: 'text', text });
  // Ohne Text hat das Modell keinen Auftrag – ein kurzer Hinweis reicht.
  if (blocks.length === input.attachments.length) {
    blocks.push({ type: 'text', text: 'Schau dir das an.' });
  }
  return { role: 'user', content: blocks };
}

/**
 * Schickt eine Nachricht ab und verarbeitet die Antwort als Stream.
 * Läuft unabhängig von der Oberfläche weiter, auch wenn der Bildschirm wechselt.
 */
export async function sendMessage(input: SendInput): Promise<void> {
  const { conversationId } = input;
  const app = useAppStore.getState();
  const runtime = useRuntimeStore.getState();

  const conversation = app.conversations[conversationId];
  if (!conversation) return;

  const apiKey = runtime.apiKey.trim();
  if (!apiKey) {
    app.setError(conversationId, 'Kein API-Schlüssel hinterlegt. Trag ihn in den Einstellungen ein.');
    return;
  }

  const userMessage = buildUserMessage(input);
  app.setError(conversationId, undefined);
  app.appendMessages(conversationId, [userMessage]);

  await runTurn(conversationId, apiKey);
}

/** Erzeugt eine Antwort auf den aktuellen Stand des Verlaufs. */
export async function runTurn(conversationId: string, apiKey: string): Promise<void> {
  const runtime = useRuntimeStore.getState();
  const controller = beginRun(conversationId);

  runtime.patchStream(conversationId, { active: true, text: '', thinking: '', tools: [] });

  const memoryOps: MemoryOps = {
    remember: (fact) => useAppStore.getState().remember(fact),
    forget: (id) => useAppStore.getState().forget(id),
    list: () => useAppStore.getState().memory,
  };

  try {
    const state = useAppStore.getState();
    const conversation = state.conversations[conversationId];
    if (!conversation) return;

    const result = await runAgent({
      apiKey,
      model: conversation.model,
      settings: state.settings,
      memory: state.memory,
      memoryOps,
      messages: conversation.messages,
      signal: controller.signal,
      events: {
        onText: (delta) => useRuntimeStore.getState().appendStream(conversationId, { text: delta }),
        onThinking: (delta) =>
          useRuntimeStore.getState().appendStream(conversationId, { thinking: delta }),
        onTool: (label) => useRuntimeStore.getState().appendStream(conversationId, { tool: label }),
        onUsage: () => undefined,
      },
    });

    useAppStore.getState().appendMessages(conversationId, result.appended);
    useAppStore.getState().addUsage(conversationId, result.usage);

    if (result.refusal) {
      useAppStore.getState().setError(conversationId, `Abgelehnt: ${result.refusal}`);
    } else if (result.stopReason === 'max_tokens') {
      useAppStore
        .getState()
        .setError(conversationId, 'Die Antwort wurde abgeschnitten, weil sie sehr lang wurde.');
    }

    maybeSpeak(result.appended);
  } catch (err) {
    if (controller.signal.aborted) {
      // Abbruch war gewollt: den bereits geschriebenen Text behalten, statt ihn
      // wegzuwerfen – sonst ist die halbe Antwort weg, nur weil man zu früh tippt.
      const partial = useRuntimeStore.getState().streams[conversationId]?.text?.trim();
      if (partial) {
        useAppStore
          .getState()
          .appendMessages(conversationId, [
            { role: 'assistant', content: [{ type: 'text', text: `${partial}\n\n_[abgebrochen]_` }] },
          ]);
      }
      useAppStore.getState().setError(conversationId, undefined);
    } else {
      useAppStore.getState().setError(conversationId, describeError(err));
    }
  } finally {
    endRun(conversationId);
    useRuntimeStore.getState().resetStream(conversationId);
  }
}

/** Antwort vorlesen, wenn das in den Einstellungen aktiviert ist. */
function maybeSpeak(appended: Anthropic.MessageParam[]): void {
  const { settings } = useAppStore.getState();
  if (!settings.speakAnswers) return;

  const parts: string[] = [];
  for (const message of appended) {
    if (message.role !== 'assistant' || typeof message.content === 'string') continue;
    for (const block of message.content) {
      if (block.type === 'text') parts.push(block.text);
    }
  }
  const text = parts.join('\n').replace(/[`*#>_~]/g, '').trim();
  if (!text) return;

  Speech.stop();
  Speech.speak(text.slice(0, 4000), { language: 'de-DE' });
}

/** Letzte Anfrage zurücknehmen und erneut schicken. */
export async function retryLast(conversationId: string): Promise<void> {
  const app = useAppStore.getState();
  const apiKey = useRuntimeStore.getState().apiKey.trim();
  if (!apiKey) return;

  const removed = app.rewindToLastUser(conversationId);
  if (!removed) return;

  useAppStore.getState().appendMessages(conversationId, [removed]);
  await runTurn(conversationId, apiKey);
}
