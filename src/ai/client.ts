import { google } from '@ai-sdk/google';
import { LanguageModelV1 } from 'ai';

/**
 * Verified working Gemini models on Free Tier, ranked in priority order
 * (Highest free quota / throughput down to secondary fallbacks).
 */
export const WORKING_FREE_TIER_MODELS = [
  'gemini-3.5-flash-lite', // 1. Best balance: 500 RPD, 15 RPM, fast & smart
  'gemini-3.1-flash-lite', // 2. Fast backup: 500 RPD, 15 RPM, ultra-low latency
  'gemini-2.5-flash',      // 3. Secondary Flash backup: 20 RPD, 5 RPM
] as const;

export function getModelSequence(): string[] {
  const envModel = process.env.GEMINI_MODEL;
  if (envModel && !WORKING_FREE_TIER_MODELS.includes(envModel as any)) {
    return [envModel, ...WORKING_FREE_TIER_MODELS];
  }
  return [...WORKING_FREE_TIER_MODELS];
}

export function getLanguageModel(modelName?: string): LanguageModelV1 | null {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    return null;
  }
  const target = modelName || getModelSequence()[0];
  return google(target);
}
