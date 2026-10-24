import { agentPaths, SKILL_NAME } from "@/lib/agents/discovery";

import { WebMcp } from "./web-mcp";

/**
 * Site-wide discovery hints for agents, mounted once in the root layout:
 * `<link>`s to llms.txt, the API catalog, the OpenAPI description and the MCP
 * server card (React hoists them into <head>), plus WebMCP tools. The
 * page-specific `<link rel="alternate" type="text/markdown">` comes from
 * `buildMetadata()` in `@/lib/seo`.
 */
export function AgentDiscovery() {
  return (
    <>
      <link rel="api-catalog" href={agentPaths.apiCatalog} />
      <link
        rel="describedby"
        type="text/plain"
        href={agentPaths.llms}
        title="llms.txt"
      />
      <link
        rel="service-desc"
        type="application/vnd.oai.openapi+json"
        href={agentPaths.openapi}
      />
      <link
        rel="service-doc"
        type="text/markdown"
        href={agentPaths.skill(SKILL_NAME)}
      />
      <link
        rel="alternate"
        type="application/json"
        href={agentPaths.mcpServerCard}
        title="MCP server card"
      />
      <WebMcp />
    </>
  );
}
