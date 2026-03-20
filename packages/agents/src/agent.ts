import { randomUUID } from "crypto";
import { query } from "@anthropic-ai/claude-agent-sdk";
import {
  AgentConfig,
  AgentRegistryEntry,
  AgentResult,
  PersistedRunRecord,
  ProgressEvent,
  RunOptions,
  StreamEvent,
  ToolCallRecord,
} from "./types";
import { getConfig, resolveAuth } from "./config";
import { persistRunRecord, slugify } from "./storage";

let activeRuns = 0;

export class Agent {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  getRegistryEntry(): AgentRegistryEntry {
    const metadata = this.config.metadata;
    return {
      id: metadata?.id ?? "custom-agent",
      slug: metadata?.slug ?? slugify(metadata?.name ?? "custom-agent"),
      name: metadata?.name ?? "Custom Agent",
      summary: metadata?.summary ?? "Custom AgentOS agent",
      description: metadata?.description,
      category: metadata?.category ?? "general",
      tags: metadata?.tags ?? [],
      kind: metadata?.kind ?? "custom",
      allowedTools: this.config.allowedTools ?? [],
      outputShape: metadata?.outputShape,
    };
  }

  private buildEnv(): {
    env: Record<string, string | undefined>;
    authMode: ReturnType<typeof resolveAuth>["authMode"];
  } {
    const auth = resolveAuth();
    const env: Record<string, string | undefined> = { ...process.env };

    if (auth.oauthToken) {
      env.CLAUDE_CODE_OAUTH_TOKEN = auth.oauthToken;
    } else if (auth.apiKey) {
      env.ANTHROPIC_API_KEY = auth.apiKey;
    }

    if (auth.baseUrl) {
      env.ANTHROPIC_BASE_URL = auth.baseUrl;
    }

    return { env, authMode: auth.authMode };
  }

  private buildPrompt(input: string, options: RunOptions): string {
    let prompt = input;

    if (options.context) {
      prompt = `Context:\n${options.context}\n\nRequest:\n${input}`;
    }

    if (options.outputFormat === "json") {
      prompt += "\n\nReturn your final output as valid JSON.";
    } else if (options.outputFormat === "markdown") {
      prompt += "\n\nFormat your final output as clean Markdown.";
    }

    return prompt;
  }

  private buildQueryOptions(options: RunOptions) {
    const globalCfg = getConfig();
    const model = this.config.model ?? globalCfg.defaultModel;
    const maxTurns = options.maxLoops ?? this.config.maxLoops ?? globalCfg.maxLoops;
    const maxSpend = globalCfg.maxSpendPerRun;
    const { env, authMode } = this.buildEnv();

    const queryOptions: Record<string, unknown> = {
      model,
      maxTurns,
      maxBudgetUsd: maxSpend,
      systemPrompt: this.config.instructions,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      env,
    };

    if (this.config.allowedTools) {
      queryOptions.allowedTools = this.config.allowedTools;
    }

    return {
      queryOptions,
      authMode,
    };
  }

  private async persistRun(
    input: string,
    result: AgentResult,
    authMode: PersistedRunRecord["authMode"]
  ): Promise<void> {
    const globalCfg = getConfig();
    if (!globalCfg.persistRuns) {
      return;
    }

    const registryEntry = this.getRegistryEntry();
    const runRecord: PersistedRunRecord = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      projectName: globalCfg.projectName ?? slugify(process.cwd()),
      cwd: process.cwd(),
      agent: registryEntry,
      input,
      inputPreview: input.slice(0, 500),
      output: result.output,
      outputPreview: result.output.slice(0, 500),
      success: result.success,
      error: result.error,
      toolCalls: result.toolCalls,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      duration: result.duration,
      loops: result.loops,
      authMode,
    };

    await persistRunRecord(runRecord, globalCfg.storageDir);
  }

  async run(input: string, options: RunOptions = {}): Promise<AgentResult> {
    const startTime = Date.now();
    const globalCfg = getConfig();

    if (globalCfg.maxConcurrentRuns && activeRuns >= globalCfg.maxConcurrentRuns) {
      const blockedResult: AgentResult = {
        output: "",
        success: false,
        error: `Max concurrent runs (${globalCfg.maxConcurrentRuns}) exceeded. Wait for other agents to finish.`,
        toolCalls: [],
        tokensUsed: { input: 0, output: 0, total: 0 },
        cost: 0,
        duration: Date.now() - startTime,
        loops: 0,
      };
      await this.persistRun(input, blockedResult, "unknown");
      return blockedResult;
    }

    activeRuns++;

    try {
      const { result, authMode } = await this.executeWithSDK(input, options, startTime);
      await this.persistRun(input, result, authMode);
      return result;
    } finally {
      activeRuns--;
    }
  }

  async *stream(
    input: string,
    options: RunOptions = {}
  ): AsyncGenerator<StreamEvent> {
    const startTime = Date.now();
    activeRuns++;

    try {
      const prompt = this.buildPrompt(input, options);
      const { queryOptions } = this.buildQueryOptions(options);
      const toolCalls: ToolCallRecord[] = [];

      const sdkQuery = query({
        prompt,
        options: queryOptions as Parameters<typeof query>[0]["options"],
      });

      let finalOutput = "";
      let totalCost = 0;
      let loops = 0;

      for await (const message of sdkQuery) {
        if (message.type === "assistant") {
          for (const block of message.message.content) {
            if ("text" in block && block.text) {
              finalOutput = block.text;
              yield { type: "text_delta", delta: block.text };
            }
            if ("name" in block) {
              yield {
                type: "tool_start",
                tool: block.name,
                input: "input" in block ? (block.input as Record<string, unknown>) : undefined,
              };
            }
          }
          loops++;
        }

        if (message.type === "result") {
          if (message.subtype === "success") {
            finalOutput = message.result;
            totalCost = message.total_cost_usd;
            loops = message.num_turns;
          }

          yield {
            type: "done",
            finalResult: {
              output: finalOutput,
              success: message.subtype === "success",
              error:
                message.subtype !== "success"
                  ? "errors" in message
                    ? message.errors.join(", ")
                    : "Unknown error"
                  : undefined,
              toolCalls,
              tokensUsed: {
                input: message.usage?.input_tokens ?? 0,
                output: message.usage?.output_tokens ?? 0,
                total: (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0),
              },
              cost: totalCost,
              duration: Date.now() - startTime,
              loops,
            },
          };
        }
      }
    } catch (err) {
      yield {
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      activeRuns--;
    }
  }

  private async executeWithSDK(
    input: string,
    options: RunOptions,
    startTime: number
  ): Promise<{
    result: AgentResult;
    authMode: PersistedRunRecord["authMode"];
  }> {
    const globalCfg = getConfig();
    const prompt = this.buildPrompt(input, options);
    const toolCalls: ToolCallRecord[] = [];
    let finalOutput = "";
    let totalCost = 0;
    let loops = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let authMode: PersistedRunRecord["authMode"] = "unknown";

    const emit = (event: Omit<ProgressEvent, "timestamp">) => {
      if (options.onProgress) {
        options.onProgress({ ...event, timestamp: Date.now() });
      }
      if (globalCfg.verbose) {
        const prefix =
          event.type === "tool_call"
            ? `  -> ${event.tool}()`
            : event.type === "tool_result"
              ? `  <- ${event.tool}`
              : event.type === "thinking"
                ? "  [thinking]"
                : "";
        if (prefix) {
          console.log(prefix, event.content.slice(0, 200));
        }
      }
    };

    try {
      const { queryOptions, authMode: resolvedAuthMode } = this.buildQueryOptions(options);
      authMode = resolvedAuthMode;

      const sdkQuery = query({
        prompt,
        options: queryOptions as Parameters<typeof query>[0]["options"],
      });

      for await (const message of sdkQuery) {
        if (message.type === "assistant") {
          for (const block of message.message.content) {
            if ("text" in block && block.text) {
              emit({ type: "text", content: block.text });
            }
            if ("name" in block) {
              const toolName = block.name;
              const toolInput = "input" in block ? (block.input as Record<string, unknown>) : {};

              emit({
                type: "tool_call",
                tool: toolName,
                input: toolInput,
                content: `Calling ${toolName}`,
              });

              toolCalls.push({
                tool: toolName,
                input: toolInput,
                output: "",
                duration: 0,
                success: true,
              });
            }
          }
        }

        if (message.type === "result") {
          if (message.subtype === "success") {
            finalOutput = message.result;
            totalCost = message.total_cost_usd;
            loops = message.num_turns;
            totalInputTokens = message.usage?.input_tokens ?? 0;
            totalOutputTokens = message.usage?.output_tokens ?? 0;
          } else {
            const errors = "errors" in message ? message.errors : [];
            return {
              authMode,
              result: {
                output: "",
                success: false,
                error: errors.join(", ") || `Agent stopped: ${message.subtype}`,
                toolCalls,
                tokensUsed: {
                  input: message.usage?.input_tokens ?? 0,
                  output: message.usage?.output_tokens ?? 0,
                  total: (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0),
                },
                cost: message.total_cost_usd ?? 0,
                duration: Date.now() - startTime,
                loops: message.num_turns ?? 0,
              },
            };
          }
        }
      }

      return {
        authMode,
        result: {
          output: finalOutput,
          success: true,
          toolCalls,
          tokensUsed: {
            input: totalInputTokens,
            output: totalOutputTokens,
            total: totalInputTokens + totalOutputTokens,
          },
          cost: Math.round(totalCost * 10000) / 10000,
          duration: Date.now() - startTime,
          loops,
        },
      };
    } catch (err) {
      return {
        authMode,
        result: {
          output: "",
          success: false,
          error: err instanceof Error ? err.message : String(err),
          toolCalls,
          tokensUsed: {
            input: totalInputTokens,
            output: totalOutputTokens,
            total: totalInputTokens + totalOutputTokens,
          },
          cost: 0,
          duration: Date.now() - startTime,
          loops,
        },
      };
    }
  }
}
