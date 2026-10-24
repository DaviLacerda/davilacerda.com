import { textResponse } from "@/lib/agents/http";
import { llmsTxt } from "@/lib/agents/markdown";

/** `/llms.txt` (https://llmstxt.org), generated from the profile and posts at build time. */
export const dynamic = "force-static";

export function GET() {
  return textResponse(llmsTxt(), "text/plain; charset=utf-8");
}
