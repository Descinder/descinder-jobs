import "server-only";
import type { ChatMessage } from "@/lib/server/ai/prompt";
import { callGroq, groqConfigured } from "@/lib/server/integrations/ai/groq";
import { callClaude, claudeConfigured } from "@/lib/server/integrations/ai/claude";

export type GenerationResult = {
  text: string; provider: "groq" | "claude"; model: string;
  inputTokens: number | null; outputTokens: number | null;
};

export function aiConfigured(): boolean {
  return groqConfigured() || claudeConfigured();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Try Groq (≤2 retries on transient), then fall back to Claude with the
// identical messages. AI_PROVIDER_MODE=claude_only is honoured via groqConfigured().
export async function providerChain(messages: ChatMessage[]): Promise<GenerationResult> {
  if (groqConfigured()) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await callGroq(messages);
        return { ...r, provider: "groq" };
      } catch {
        if (attempt < 2) await sleep(250 * (attempt + 1));
      }
    }
  }
  if (claudeConfigured()) {
    const r = await callClaude(messages);
    return { ...r, provider: "claude" };
  }
  throw new Error("No AI provider available");
}
