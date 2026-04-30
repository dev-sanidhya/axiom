import { Composio } from "@composio/core";

export interface McpServerEntry {
  type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
}

let composioInstance: Composio | null = null;

function getComposio(apiKey: string): Composio {
  if (!composioInstance) {
    composioInstance = new Composio({ apiKey });
  }
  return composioInstance;
}

/**
 * Build an MCP server config for a set of Composio toolkits.
 * Returns null if no API key is available or toolkits list is empty.
 */
export async function buildComposioMcpServer(
  toolkits: string[],
  apiKey?: string
): Promise<McpServerEntry | null> {
  const resolvedKey = apiKey ?? process.env.COMPOSIO_API_KEY;
  if (!resolvedKey || toolkits.length === 0) {
    return null;
  }

  try {
    const composio = getComposio(resolvedKey);
    const session = await composio.create("axiom-local", { toolkits });
    return {
      type: "http",
      url: session.mcp.url,
      headers: session.mcp.headers,
    };
  } catch {
    return null;
  }
}

/**
 * Build the allowedTools entries for Composio MCP tools.
 * Produces mcp__composio__* wildcard entries per toolkit.
 */
export function buildComposioAllowedTools(toolkits: string[]): string[] {
  if (toolkits.length === 0) return [];
  return ["mcp__composio__*"];
}

export function resetComposioInstance(): void {
  composioInstance = null;
}
