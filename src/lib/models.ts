import type Anthropic from '@anthropic-ai/sdk';

/** Die Modelle, die die App anbietet. */
export type ModelId = 'claude-opus-5' | 'claude-sonnet-5' | 'claude-haiku-4-5';

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ModelInfo {
  id: ModelId;
  name: string;
  tagline: string;
  /** Obergrenze für max_tokens bei diesem Modell. */
  maxOutput: number;
  /** Adaptives Denken statt festem budget_tokens. */
  adaptiveThinking: boolean;
  /** Unterstützt output_config.effort. */
  supportsEffort: boolean;
  inputPricePerMTok: number;
  outputPricePerMTok: number;
}

export const MODELS: ModelInfo[] = [
  {
    id: 'claude-opus-5',
    name: 'Opus 5',
    tagline: 'Das stärkste Modell – für alles, was wirklich schwierig ist.',
    maxOutput: 128000,
    adaptiveThinking: true,
    supportsEffort: true,
    inputPricePerMTok: 5,
    outputPricePerMTok: 25,
  },
  {
    id: 'claude-sonnet-5',
    name: 'Sonnet 5',
    tagline: 'Sehr stark und deutlich günstiger – guter Alltagsmodus.',
    maxOutput: 128000,
    adaptiveThinking: true,
    supportsEffort: true,
    inputPricePerMTok: 2,
    outputPricePerMTok: 10,
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Haiku 4.5',
    tagline: 'Schnell und billig – für kurze Fragen unterwegs.',
    maxOutput: 64000,
    adaptiveThinking: false,
    supportsEffort: false,
    inputPricePerMTok: 1,
    outputPricePerMTok: 5,
  },
];

export const DEFAULT_MODEL: ModelId = 'claude-opus-5';

export function getModel(id: ModelId): ModelInfo {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

/**
 * Baut die Thinking-Konfiguration für das gewählte Modell.
 * Opus 5 / Sonnet 5 nutzen adaptives Denken, Haiku 4.5 noch budget_tokens.
 */
export function thinkingFor(
  model: ModelInfo,
  show: boolean,
  maxTokens: number,
): Anthropic.MessageCreateParams['thinking'] {
  if (model.adaptiveThinking) {
    return { type: 'adaptive', display: show ? 'summarized' : 'omitted' };
  }
  return { type: 'enabled', budget_tokens: Math.min(8000, Math.floor(maxTokens / 2)) };
}

/** Grobe Kostenschätzung in US-Dollar. */
export function estimateCost(
  model: ModelInfo,
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number },
): number {
  const inRate = model.inputPricePerMTok / 1_000_000;
  const outRate = model.outputPricePerMTok / 1_000_000;
  return (
    usage.input * inRate +
    usage.cacheWrite * inRate * 1.25 +
    usage.cacheRead * inRate * 0.1 +
    usage.output * outRate
  );
}
