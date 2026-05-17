import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { ChatMessage } from "@/lib/server/ai/prompt";

export const CLAUDE_MODEL = "claude-haiku-4-5";
export function claudeConfigured(): boolean {
  return !!env.ANTHROPIC_API_KEY;
}
let _c: Anthropic | null = null;
function client(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
  if (!_c) _c = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _c;
}
export async function callClaude(messages: ChatMessage[]): Promise<{
  text: string; model: string; inputTokens: number | null; outputTokens: number | null;
}> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
  const res = await client().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    temperature: 0.3,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text.trim()) throw new Error("Claude returned empty content");
  return {
    text,
    model: CLAUDE_MODEL,
    inputTokens: res.usage?.input_tokens ?? null,
    outputTokens: res.usage?.output_tokens ?? null,
  };
}
