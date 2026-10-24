import { estimateTokens, textResponse } from "@/lib/agents/http";
import { llmsFullTxt } from "@/lib/agents/markdown";

/** `/llms-full.txt`: the full profile in both languages and every post, inline. */
export const dynamic = "force-static";

export function GET() {
  const body = llmsFullTxt();
  return textResponse(body, "text/plain; charset=utf-8", {
    headers: { "x-markdown-tokens": String(estimateTokens(body)) },
  });
}
