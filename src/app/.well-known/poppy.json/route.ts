import { jsonResponse } from "@/lib/agents/http";
import { poppyManifest } from "@/lib/agents/well-known";

/** `/.well-known/poppy.json`: Personal Agent Protocol (draft), website-only declaration without auth. */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(poppyManifest());
}
