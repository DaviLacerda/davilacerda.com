import { SKILL_NAME } from "@/lib/agents/discovery";
import { textResponse } from "@/lib/agents/http";
import { skillMarkdown } from "@/lib/agents/well-known";

/** `/.well-known/agent-skills/about-davi-lacerda/SKILL.md`. Its sha256 is listed in index.json. */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ name: SKILL_NAME }];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (name !== SKILL_NAME) return new Response("Not found", { status: 404 });
  return textResponse(skillMarkdown(), "text/markdown; charset=utf-8");
}
