import path from "path";
import { AuthMode, GlobalConfig } from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_LOOPS = 10;
const DEFAULT_MAX_SPEND_PER_RUN = 1.0; // $1 USD
const DEFAULT_STORAGE_DIR = path.join(process.cwd(), ".agentos");

let globalConfig: GlobalConfig = {};

/**
 * Configure AgentOS globally. Call this once before using any agents.
 *
 * @example
 * ```ts
 * // Using Claude Max/Pro plan (recommended — no API billing needed)
 * configure({ oauthToken: process.env.CLAUDE_CODE_OAUTH_TOKEN });
 * ```
 *
 * @example
 * ```ts
 * // Using standard API key
 * configure({ apiKey: process.env.ANTHROPIC_API_KEY });
 * ```
 *
 * @example
 * ```ts
 * // With AgentOS proxy (one key for everything)
 * configure({ apiKey: process.env.AGENTOS_API_KEY, baseUrl: 'https://api.agentos.dev' });
 * ```
 */
export function configure(config: GlobalConfig): void {
  if (Object.keys(config).length === 0) {
    // Empty object resets config entirely
    globalConfig = {};
  } else {
    globalConfig = { ...globalConfig, ...config };
  }
}

/**
 * Get the current global configuration, with defaults applied.
 */
export function getConfig(): Required<
  Pick<
    GlobalConfig,
    "defaultModel" | "maxLoops" | "verbose" | "maxSpendPerRun" | "persistRuns"
  >
> &
  GlobalConfig {
  return {
    ...globalConfig,
    defaultModel: globalConfig.defaultModel ?? DEFAULT_MODEL,
    maxLoops: globalConfig.maxLoops ?? DEFAULT_MAX_LOOPS,
    verbose: globalConfig.verbose ?? false,
    maxSpendPerRun: globalConfig.maxSpendPerRun ?? DEFAULT_MAX_SPEND_PER_RUN,
    persistRuns: globalConfig.persistRuns ?? true,
    storageDir: globalConfig.storageDir ?? DEFAULT_STORAGE_DIR,
    projectName: globalConfig.projectName ?? path.basename(process.cwd()),
  };
}

/**
 * Authentication resolution result.
 */
export interface AuthConfig {
  apiKey?: string;
  oauthToken?: string;
  baseUrl?: string;
  authMode: AuthMode;
}

/**
 * Resolve authentication from config or environment variables.
 *
 * Priority order:
 * 1. CLAUDE_CODE_OAUTH_TOKEN (Max/Pro plan — free with subscription)
 * 2. Config oauthToken
 * 3. AGENTOS_API_KEY (future proxy)
 * 4. ANTHROPIC_API_KEY (standard API key)
 * 5. Config apiKey
 */
export function resolveAuth(): AuthConfig {
  // Check for OAuth token first (Max/Pro plan)
  const oauthToken =
    globalConfig.oauthToken ??
    process.env.CLAUDE_CODE_OAUTH_TOKEN;

  if (oauthToken) {
    return {
      oauthToken,
      baseUrl: globalConfig.baseUrl,
      authMode: "oauth_token",
    };
  }

  // Fall back to API key
  const apiKey =
    globalConfig.apiKey ??
    process.env.AGENTOS_API_KEY ??
    process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    return {
      apiKey,
      baseUrl: globalConfig.baseUrl,
      authMode: "api_key",
    };
  }

  throw new Error(
    "No authentication found. Set up auth using one of these methods:\n\n" +
      "  1. Claude Max/Pro plan (recommended — no API billing):\n" +
      "     Run: claude setup-token\n" +
      "     Then: export CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...\n\n" +
      "  2. Anthropic API key:\n" +
      "     export ANTHROPIC_API_KEY=sk-ant-...\n\n" +
      "  3. In code:\n" +
      "     configure({ oauthToken: '...' }) or configure({ apiKey: '...' })"
  );
}

/**
 * Legacy helper — resolves API key (throws if only OAuth is available).
 * Prefer resolveAuth() for new code.
 */
export function resolveApiKey(): string {
  const auth = resolveAuth();
  if (auth.apiKey) return auth.apiKey;
  if (auth.oauthToken) return auth.oauthToken;
  throw new Error("No API key or OAuth token found.");
}
