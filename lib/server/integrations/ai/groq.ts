import "server-only";
import Groq from "groq-sdk";
import { env } from "@/lib/env";
import type { ChatMessage } from "@/lib/server/ai/prompt";

export const GROQ_MODEL = "llama-3.3-70b-versatile";
export function groqConfigured(): boolean {
  return !!env.GROQ_API_KEY && env.AI_PROVIDER_MODE !== "claude_only";
}
let _g: Groq | null = null;
function client(): Groq {
  if (!env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");
  if (!_g) _g = new Groq({ apiKey: env.GROQ_API_KEY });
  return _g;
}
export async function callGroq(messages: ChatMessage[]): Promise<{
  text: string; model: string; inputTokens: number | null; outputTokens: number | null;
}> {
  const res = await client().chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 4096,
  });
  const text = res.choices[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("Groq returned empty content");
  return {
    text,
    model: GROQ_MODEL,
    inputTokens: res.usage?.prompt_tokens ?? null,
    outputTokens: res.usage?.completion_tokens ?? null,
  };
}
