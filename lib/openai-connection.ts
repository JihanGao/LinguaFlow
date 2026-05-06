import OpenAI from "openai";

/**
 * Official OpenAI or OpenAI-compatible endpoint (oMLX, LM Studio, Ollama /v1, etc.).
 * Set OPENAI_BASE_URL when using a local server; OPENAI_API_KEY can be a placeholder like "local" if the server ignores it.
 */
export function createOpenAIConnection(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {})
  });
}
