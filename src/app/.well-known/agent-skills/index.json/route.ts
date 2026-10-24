import { jsonResponse } from "@/lib/agents/http";
import { agentSkillsIndex } from "@/lib/agents/well-known";

/** `/.well-known/agent-skills/index.json` (Agent Skills Discovery v0.2.0). */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(agentSkillsIndex());
}
