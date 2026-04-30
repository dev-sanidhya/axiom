import { Composio } from "@composio/core";
import { query } from "@anthropic-ai/claude-agent-sdk";

export interface McpServerEntry {
  type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
}

interface CachedSession {
  server: McpServerEntry;
  expiresAt: number;
}

// Reuse Composio instance across calls
let composioInstance: Composio | null = null;

// Cache sessions by sorted toolkit key to avoid recreating on every run
const sessionCache = new Map<string, CachedSession>();
const SESSION_TTL_MS = 25 * 60 * 1000; // 25 min - conservative under Composio session expiry

function getComposio(apiKey: string): Composio {
  if (!composioInstance) {
    composioInstance = new Composio({ apiKey });
  }
  return composioInstance;
}

function cacheKey(toolkits: string[]): string {
  return [...toolkits].sort().join(",");
}

function getCached(toolkits: string[]): McpServerEntry | null {
  const entry = sessionCache.get(cacheKey(toolkits));
  if (!entry || Date.now() > entry.expiresAt) {
    sessionCache.delete(cacheKey(toolkits));
    return null;
  }
  return entry.server;
}

function setCache(toolkits: string[], server: McpServerEntry): void {
  sessionCache.set(cacheKey(toolkits), {
    server,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

const ROUTER_SYSTEM = `You are a tool router for an AI agent system.
Given a task input and a list of available Composio toolkits, return only the toolkits genuinely needed to complete the task.
Be conservative - prefer fewer tools. Pure text tasks need none.

Rules:
- HACKERNEWS: only for tech community news, trending topics, developer discussion
- GITHUB: only for code search, repos, issues, pull requests, release lookup
- Return [] for writing, drafting, analysis from provided text, or anything that doesn't need external data

Return a raw JSON array of toolkit names from the available list only. Nothing else.`;

/**
 * Uses Haiku to filter availableToolkits down to only what the input actually needs.
 * Falls back to the full list if the call fails.
 */
async function routeToolkits(
  input: string,
  availableToolkits: string[],
  auth: { oauthToken?: string; apiKey?: string }
): Promise<string[]> {
  if (availableToolkits.length === 0) return [];

  const env: Record<string, string | undefined> = { ...process.env };
  if (auth.oauthToken) env.CLAUDE_CODE_OAUTH_TOKEN = auth.oauthToken;
  else if (auth.apiKey) env.ANTHROPIC_API_KEY = auth.apiKey;

  const prompt = `Available toolkits: ${availableToolkits.join(", ")}\n\nTask: ${input.slice(0, 600)}`;

  try {
    let resultText = "";

    const sdkQuery = query({
      prompt,
      options: {
        model: "claude-haiku-4-5-20251001",
        maxTurns: 1,
        allowedTools: [],
        systemPrompt: ROUTER_SYSTEM,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        env,
      } as Parameters<typeof query>[0]["options"],
    });

    for await (const message of sdkQuery) {
      if (message.type === "result" && message.subtype === "success") {
        resultText = message.result;
      }
    }

    const match = resultText.match(/\[[\s\S]*?\]/);
    const parsed = JSON.parse(match?.[0] ?? "[]") as unknown[];
    const selected = parsed
      .filter((t): t is string => typeof t === "string")
      .filter((t) => availableToolkits.includes(t));

    return selected;
  } catch {
    // If routing fails, fall back to full toolkit list so the agent still works
    return availableToolkits;
  }
}

/**
 * Build an MCP server config for the given toolkits.
 * - Routes through Haiku to pick only needed toolkits for this specific input
 * - Caches sessions by toolkit combination for 25 minutes
 * - Returns null if no API key, no toolkits needed, or Composio is unreachable
 */
export async function buildComposioMcpServer(
  toolkits: string[],
  input: string,
  auth: { oauthToken?: string; apiKey?: string },
  composioApiKey?: string
): Promise<McpServerEntry | null> {
  const resolvedKey = composioApiKey ?? process.env.COMPOSIO_API_KEY;
  if (!resolvedKey || toolkits.length === 0) return null;

  const needed = await routeToolkits(input, toolkits, auth);
  if (needed.length === 0) return null;

  const cached = getCached(needed);
  if (cached) return cached;

  try {
    const composio = getComposio(resolvedKey);
    const session = await composio.create("axiom-local", { toolkits: needed });
    const server: McpServerEntry = {
      type: "http",
      url: session.mcp.url,
      headers: session.mcp.headers,
    };
    setCache(needed, server);
    return server;
  } catch {
    return null;
  }
}

export function buildComposioAllowedTools(toolkits: string[]): string[] {
  if (toolkits.length === 0) return [];
  return ["mcp__composio__*"];
}

export function resetComposioInstance(): void {
  composioInstance = null;
  sessionCache.clear();
}
