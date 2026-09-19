import type Anthropic from '@anthropic-ai/sdk';
import type { RNLlamaOAICompatibleMessage } from 'llama.rn';

/**
 * Übersetzt den gespeicherten API-Verlauf in das Format, das ein lokales Modell
 * versteht: reiner Text, keine Werkzeuge, keine Denkblöcke.
 *
 * Anhänge werden als Hinweis eingesetzt statt weggelassen – sonst wirkt der
 * Verlauf lückenhaft ("Was steht da?" ohne erkennbaren Bezug).
 */
export function toLocalMessages(
  system: string,
  messages: Anthropic.MessageParam[],
): RNLlamaOAICompatibleMessage[] {
  const result: RNLlamaOAICompatibleMessage[] = [{ role: 'system', content: system }];

  for (const message of messages) {
    const content = message.content;
    const blocks: Anthropic.ContentBlockParam[] =
      typeof content === 'string' ? [{ type: 'text', text: content }] : content;

    // Werkzeug-Ergebnisse gehören zur Cloud-Betriebsart und haben hier keine Entsprechung.
    if (blocks.length > 0 && blocks.every((block) => block.type === 'tool_result')) continue;

    const parts: string[] = [];
    for (const block of blocks) {
      switch (block.type) {
        case 'text':
          if (block.text.trim()) parts.push(block.text);
          break;
        case 'image':
          parts.push('[Bild angehängt – dieses Modell kann keine Bilder sehen]');
          break;
        case 'document':
          parts.push(`[PDF angehängt: ${block.title ?? 'Dokument'} – dieses Modell kann es nicht lesen]`);
          break;
        default:
          // Denkblöcke und Werkzeugaufrufe überspringen.
          break;
      }
    }

    const text = parts.join('\n\n').trim();
    if (!text) continue;

    const role = message.role;
    const previous = result[result.length - 1];
    // Gleiche Rolle zweimal hintereinander bringt manche Chat-Vorlagen durcheinander.
    if (previous && previous.role === role && typeof previous.content === 'string') {
      previous.content = `${previous.content}\n\n${text}`;
      continue;
    }

    result.push({ role, content: text });
  }

  return result;
}

const LOCAL_BASE = `Du bist "KI", eine Assistenz, die vollständig auf dem Handy dieser Person läuft. Keine Anfrage verlässt das Gerät.

- Antworte in der Sprache der Frage, bei Deutsch in natürlichem Deutsch.
- Fasse dich kurz und werde konkret. Keine Einleitungsfloskeln.
- Du hast keinen Internetzugang und kannst nichts nachschlagen. Sag es offen, wenn eine Frage aktuelles Wissen braucht.
- Erfinde niemals Quellen, Zahlen oder Zitate. Wenn du etwas nicht weißt, sag das.`;

/**
 * Eigener Systemprompt für den lokalen Betrieb: kleinere Modelle brauchen
 * kürzere, klarere Anweisungen, und Werkzeuge gibt es hier nicht.
 */
export function buildLocalSystemPrompt(persona: string, memory: { fact: string }[]): string {
  const parts = [LOCAL_BASE];

  if (persona.trim()) {
    parts.push(`Anweisungen dieser Person:\n${persona.trim()}`);
  }

  if (memory.length > 0) {
    parts.push(`Was du über diese Person weißt:\n${memory.map((m) => `- ${m.fact}`).join('\n')}`);
  }

  return parts.join('\n\n');
}
