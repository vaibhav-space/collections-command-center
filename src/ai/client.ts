import { google } from '@ai-sdk/google';
import { LanguageModelV1 } from 'ai';

export function getLanguageModel(): LanguageModelV1 | null {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.startsWith('your_')) {
    return null;
  }
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  return google(modelName);
}
