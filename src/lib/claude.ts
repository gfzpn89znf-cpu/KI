import Anthropic from '@anthropic-ai/sdk';
import { fetch as expoFetch } from 'expo/fetch';

import { getModel, thinkingFor, type ModelId } from '@/lib/models';
import { buildSystemPrompt } from '@/lib/prompt';
import type { MemoryItem, Settings, UsageTotals } from '@/state/types';

/** Obergrenze für Werkzeug-Runden, damit eine Schleife nie endlos läuft. */
const MAX_TURNS = 24;

export interface AgentEvents {
  onThinking(delta: string): void;
  onText(delta: string): void;
  /** Ein Werkzeug wurde angestoßen bzw. ist fertig – für die Statuszeile. */
  onTool(label: string): void;
  onUsage(usage: UsageTotals): void;
}

export interface MemoryOps {
  remember(fact: string): MemoryItem;
  forget(id: string): boolean;
  list(): MemoryItem[];
}

export interface RunOptions {
  apiKey: string;
  model: ModelId;
  settings: Settings;
  memory: MemoryItem[];
  memoryOps: MemoryOps;
  /** Vollständiger Verlauf inklusive der neuen Nutzer-Nachricht. */
  messages: Anthropic.MessageParam[];
  signal: AbortSignal;
  events: AgentEvents;
}

export interface RunResult {
  /** Die neu entstandenen Nachrichten, die an den Verlauf angehängt werden. */
  appended: Anthropic.MessageParam[];
  usage: UsageTotals;
  stopReason: Anthropic.Message['stop_reason'];
  /** Gesetzt, wenn das Modell die Anfrage abgelehnt hat. */
  refusal?: string;
}

function createClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    // React Native hat keinen Streaming-fähigen fetch; expo/fetch schon.
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    // Der Schlüssel liegt bewusst auf dem Gerät – siehe README, Abschnitt Sicherheit.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
}

const REMEMBER_TOOL: Anthropic.Tool = {
  name: 'remember',
  description:
    'Speichere eine dauerhafte Information über die Person, die über dieses Gespräch hinaus gilt (Name, Vorlieben, Arbeitskontext, wie sie angesprochen werden will). Eine Information pro Aufruf, als vollständiger Satz formuliert.',
  input_schema: {
    type: 'object',
    properties: {
      fact: {
        type: 'string',
        description: 'Die Information als knapper, vollständiger Satz, z. B. "Heißt Till und programmiert hobbymäßig in Python."',
      },
    },
    required: ['fact'],
    additionalProperties: false,
  },
};

const FORGET_TOOL: Anthropic.Tool = {
  name: 'forget',
  description:
    'Lösche eine gespeicherte Information, die nicht mehr stimmt. Die ID steht im Systemprompt in eckigen Klammern vor der jeweiligen Information.',
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Die ID der zu löschenden Information.' },
    },
    required: ['id'],
    additionalProperties: false,
  },
};

type ToolList = NonNullable<Anthropic.MessageCreateParams['tools']>;

/**
 * Stellt die Werkzeugliste zusammen.
 *
 * Wichtig: Die neuen Websuch-Varianten (`*_20260209`) führen intern selbst Code
 * aus. Sie dürfen deshalb nicht zusammen mit einem eigenen
 * `code_execution`-Werkzeug deklariert werden – in dem Fall fallen wir auf die
 * einfachen Such-Varianten zurück.
 */
export function buildTools(settings: Settings): ToolList {
  const tools: ToolList = [];
  const both = settings.webSearch && settings.codeExecution;

  if (settings.webSearch) {
    if (both) {
      tools.push({ type: 'web_search_20250305', name: 'web_search', max_uses: 8 });
      tools.push({ type: 'web_fetch_20250910', name: 'web_fetch', max_uses: 8 });
    } else {
      tools.push({ type: 'web_search_20260209', name: 'web_search', max_uses: 8 });
      tools.push({ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 8 });
    }
  }

  if (settings.codeExecution) {
    tools.push({ type: 'code_execution_20260521', name: 'code_execution' });
  }

  if (settings.memoryEnabled) {
    tools.push(REMEMBER_TOOL, FORGET_TOOL);
  }

  return tools;
}

function addUsage(total: UsageTotals, usage: Anthropic.Usage): UsageTotals {
  return {
    input: total.input + (usage.input_tokens ?? 0),
    output: total.output + (usage.output_tokens ?? 0),
    cacheRead: total.cacheRead + (usage.cache_read_input_tokens ?? 0),
    cacheWrite: total.cacheWrite + (usage.cache_creation_input_tokens ?? 0),
  };
}

function toolLabel(name: string, input: unknown): string {
  const data = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case 'web_search':
      return typeof data.query === 'string' ? `Suche: ${data.query}` : 'Websuche';
    case 'web_fetch':
      return 'Seite wird gelesen';
    case 'code_execution':
      return 'Code wird ausgeführt';
    case 'remember':
      return 'Wird gemerkt';
    case 'forget':
      return 'Wird vergessen';
    default:
      return name;
  }
}

/**
 * Führt die clientseitigen Werkzeuge aus (nur Gedächtnis) und liefert die
 * Ergebnisblöcke. Serverseitige Werkzeuge laufen bei Anthropic und tauchen
 * hier nicht auf.
 */
function runClientTools(
  content: Anthropic.ContentBlock[],
  ops: MemoryOps,
  events: AgentEvents,
): Anthropic.ToolResultBlockParam[] {
  const results: Anthropic.ToolResultBlockParam[] = [];

  for (const block of content) {
    if (block.type !== 'tool_use') continue;

    // Die Eingabe kommt als geparstes JSON zurück – nie per String-Matching lesen.
    const input = (block.input ?? {}) as Record<string, unknown>;

    if (block.name === 'remember') {
      const fact = typeof input.fact === 'string' ? input.fact.trim() : '';
      if (!fact) {
        results.push({ type: 'tool_result', tool_use_id: block.id, is_error: true, content: 'Kein Text übergeben.' });
        continue;
      }
      const item = ops.remember(fact);
      events.onTool(`Gemerkt: ${fact}`);
      results.push({ type: 'tool_result', tool_use_id: block.id, content: `Gespeichert unter der ID ${item.id}.` });
      continue;
    }

    if (block.name === 'forget') {
      const id = typeof input.id === 'string' ? input.id : '';
      const removed = ops.forget(id);
      events.onTool(removed ? 'Vergessen' : 'Nichts zu vergessen');
      results.push({
        type: 'tool_result',
        tool_use_id: block.id,
        is_error: !removed,
        content: removed ? 'Gelöscht.' : `Keine gespeicherte Information mit der ID ${id}.`,
      });
      continue;
    }

    results.push({
      type: 'tool_result',
      tool_use_id: block.id,
      is_error: true,
      content: `Unbekanntes Werkzeug: ${block.name}`,
    });
  }

  return results;
}

/**
 * Die Agenten-Schleife: streamt eine Antwort, führt Werkzeuge aus und macht
 * weiter, bis das Modell fertig ist.
 */
export async function runAgent(options: RunOptions): Promise<RunResult> {
  const { apiKey, model: modelId, settings, memory, memoryOps, signal, events } = options;
  const client = createClient(apiKey);
  const model = getModel(modelId);
  const maxTokens = Math.min(model.maxOutput, 64000);
  const tools = buildTools(settings);

  const conversation = [...options.messages];
  const startLength = conversation.length;
  let usage: UsageTotals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let stopReason: Anthropic.Message['stop_reason'] = null;
  let refusal: string | undefined;

  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    if (signal.aborted) break;

    const params: Anthropic.MessageStreamParams = {
      model: model.id,
      max_tokens: maxTokens,
      system: buildSystemPrompt(settings, memory),
      messages: conversation,
      thinking: thinkingFor(model, settings.showThinking, maxTokens),
      // Cacht den letzten cachefähigen Block – bei langen Gesprächen spürbar billiger.
      cache_control: { type: 'ephemeral' },
      ...(tools.length > 0 ? { tools } : {}),
      ...(model.supportsEffort ? { output_config: { effort: settings.effort } } : {}),
    };

    const stream = client.messages.stream(params, { signal });

    try {
      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          const block = event.content_block;
          if (block.type === 'server_tool_use' || block.type === 'tool_use') {
            events.onTool(toolLabel(block.name, block.input));
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') events.onText(event.delta.text);
          else if (event.delta.type === 'thinking_delta') events.onThinking(event.delta.thinking);
        }
      }
    } catch (err) {
      stream.abort();
      throw err;
    }

    const message = await stream.finalMessage();
    usage = addUsage(usage, message.usage);
    events.onUsage(usage);
    stopReason = message.stop_reason;

    conversation.push({ role: 'assistant', content: message.content });

    if (message.stop_reason === 'pause_turn') {
      // Langlaufendes Serverwerkzeug: einfach mit demselben Verlauf fortsetzen.
      continue;
    }

    if (message.stop_reason === 'refusal') {
      refusal = message.stop_details?.explanation ?? 'Die Anfrage wurde abgelehnt.';
      break;
    }

    if (message.stop_reason === 'max_tokens') {
      // Bei abgeschnittener Werkzeug-Eingabe darf das Werkzeug nicht laufen.
      break;
    }

    if (message.stop_reason === 'tool_use') {
      const results = runClientTools(message.content, memoryOps, events);
      if (results.length === 0) break;
      conversation.push({ role: 'user', content: results });
      continue;
    }

    break;
  }

  return {
    appended: conversation.slice(startLength),
    usage,
    stopReason,
    refusal,
  };
}

/** Übersetzt SDK-Fehler in etwas, das man einem Menschen zeigen kann. */
export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Der API-Schlüssel wird nicht akzeptiert. Prüf ihn in den Einstellungen.';
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return 'Dieser Schlüssel darf das angefragte Modell nicht nutzen.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Zu viele Anfragen in kurzer Zeit. Warte einen Moment und versuch es nochmal.';
  }
  if (err instanceof Anthropic.BadRequestError) {
    return `Die Anfrage wurde abgelehnt: ${err.message}`;
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Keine Verbindung zum Server. Ist das Handy online?';
  }
  if (err instanceof Anthropic.APIError) {
    return `Fehler ${err.status ?? ''}: ${err.message}`.trim();
  }
  if (err instanceof Error) {
    if (err.name === 'AbortError') return 'Abgebrochen.';
    return err.message;
  }
  return 'Unbekannter Fehler.';
}
