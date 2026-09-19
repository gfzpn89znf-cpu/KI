import type Anthropic from '@anthropic-ai/sdk';

export interface AttachmentChip {
  kind: 'image' | 'document';
  name: string;
}

export type ChatItem =
  | { key: string; role: 'user'; text: string; attachments: AttachmentChip[] }
  | { key: string; role: 'assistant'; text: string; thinking: string; tools: string[]; pending: boolean };

function labelForServerTool(name: string, input: unknown): string {
  const data = (input ?? {}) as Record<string, unknown>;
  if (name === 'web_search' && typeof data.query === 'string') return `Gesucht: ${data.query}`;
  if (name === 'web_fetch' && typeof data.url === 'string') return `Gelesen: ${data.url}`;
  if (name === 'code_execution') return 'Code ausgeführt';
  return name;
}

function labelForClientTool(name: string, input: unknown): string {
  const data = (input ?? {}) as Record<string, unknown>;
  if (name === 'remember' && typeof data.fact === 'string') return `Gemerkt: ${data.fact}`;
  if (name === 'forget') return 'Etwas vergessen';
  return name;
}

/**
 * Leitet die Oberfläche aus dem API-Verlauf ab. Aufeinanderfolgende
 * Assistenz-Nachrichten und die dazwischenliegenden Werkzeug-Ergebnisse werden
 * zu einer Blase zusammengefasst, damit eine Antwort mit Websuche nicht in
 * fünf Teile zerfällt.
 */
export function deriveItems(messages: Anthropic.MessageParam[]): ChatItem[] {
  const items: ChatItem[] = [];
  let group: Extract<ChatItem, { role: 'assistant' }> | null = null;

  const flush = () => {
    if (group && (group.text.trim() || group.thinking.trim() || group.tools.length > 0)) {
      items.push(group);
    }
    group = null;
  };

  messages.forEach((message, index) => {
    const content = message.content;
    const blocks: Anthropic.ContentBlockParam[] =
      typeof content === 'string' ? [{ type: 'text', text: content }] : content;

    if (message.role === 'user') {
      const onlyToolResults = blocks.length > 0 && blocks.every((b) => b.type === 'tool_result');
      if (onlyToolResults) return; // gehört zur laufenden Assistenz-Antwort

      flush();
      const texts: string[] = [];
      const attachments: AttachmentChip[] = [];

      for (const block of blocks) {
        if (block.type === 'text') texts.push(block.text);
        else if (block.type === 'image') attachments.push({ kind: 'image', name: 'Bild' });
        else if (block.type === 'document') {
          attachments.push({ kind: 'document', name: block.title ?? 'Dokument' });
        }
      }

      items.push({ key: `u${index}`, role: 'user', text: texts.join('\n\n'), attachments });
      return;
    }

    if (!group) {
      group = { key: `a${index}`, role: 'assistant', text: '', thinking: '', tools: [], pending: false };
    }

    for (const block of blocks) {
      switch (block.type) {
        case 'text':
          group.text += block.text;
          break;
        case 'thinking':
          group.thinking += block.thinking;
          break;
        case 'server_tool_use':
          group.tools.push(labelForServerTool(block.name, block.input));
          break;
        case 'tool_use':
          group.tools.push(labelForClientTool(block.name, block.input));
          break;
        default:
          break;
      }
    }
  });

  flush();
  return items;
}
