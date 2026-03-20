import { query } from "@anthropic-ai/claude-agent-sdk";
import { Agent } from "./agent";
import { getConfig, resolveAuth } from "./config";
import {
  AgentCategory,
  AgentRegistryEntry,
  AgentResult,
  RunOptions,
  SavedAgentDefinition,
} from "./types";
import {
  listSavedAgentDefinitions,
  loadAgentDefinition,
  saveAgent as persistAgentDefinition,
  slugify,
  toRegistryEntry,
} from "./storage";

const FRIENDLY_TO_SDK_TOOLS: Record<string, string> = {
  web_search: "WebSearch",
  web_scrape: "WebFetch",
  read_file: "Read",
  list_files: "Glob",
  grep: "Grep",
  bash: "Bash",
};

const BUILDER_PROMPT = `You are AgentOS Builder. Turn a plain-English agent description into a reusable agent definition.

Return strict JSON with this shape:
{
  "name": "Short agent name",
  "summary": "One-sentence summary",
  "category": "engineering|product|research|business|marketing|finance|support|operations|general",
  "tags": ["tag1", "tag2"],
  "allowedTools": ["web_search", "web_scrape", "read_file", "list_files", "grep", "bash"],
  "outputShape": "Short description of the expected output shape",
  "systemPrompt": "Detailed system instructions for the agent"
}

Rules:
- Prefer the fewest tools needed.
- Use no tools for pure drafting/summarization unless external files/web access is clearly required.
- Make the system prompt production-ready: role, method, output format, rules, and failure behavior.
- Tags should be concise and lowercase.
- Output raw JSON only.`;

export interface AgentSpec {
  task: string;
  inputs?: string;
  outputs?: string;
  tools?: string[];
  additionalInstructions?: string;
  name?: string;
  summary?: string;
  category?: AgentCategory;
  tags?: string[];
}

interface BuilderResponse {
  name: string;
  summary: string;
  category: AgentCategory;
  tags: string[];
  allowedTools: string[];
  outputShape: string;
  systemPrompt: string;
}

function mapFriendlyToolsToSdk(toolNames?: string[]): string[] {
  if (!toolNames) {
    return [];
  }

  return Array.from(
    new Set(
      toolNames
        .map((tool) => FRIENDLY_TO_SDK_TOOLS[tool] ?? tool)
        .filter((tool): tool is string => Boolean(tool))
    )
  );
}

function mapSdkToolsToFriendly(toolNames?: string[]): string[] {
  if (!toolNames) {
    return [];
  }

  const reverseMap = Object.fromEntries(
    Object.entries(FRIENDLY_TO_SDK_TOOLS).map(([friendly, sdk]) => [sdk, friendly])
  );

  return Array.from(
    new Set(toolNames.map((tool) => reverseMap[tool] ?? tool.toLowerCase()))
  );
}

function inferToolsFromDescription(description: string): string[] {
  const lower = description.toLowerCase();

  if (
    lower.includes("csv") ||
    lower.includes("json") ||
    lower.includes("dataset") ||
    lower.includes("financial") ||
    lower.includes("spreadsheet")
  ) {
    return ["read_file", "list_files", "bash"];
  }

  if (
    lower.includes("code") ||
    lower.includes("repo") ||
    lower.includes("repository") ||
    lower.includes("bug") ||
    lower.includes("pr") ||
    lower.includes("release")
  ) {
    return ["read_file", "list_files", "grep"];
  }

  if (
    lower.includes("research") ||
    lower.includes("market") ||
    lower.includes("competitor") ||
    lower.includes("seo") ||
    lower.includes("web") ||
    lower.includes("news")
  ) {
    return ["web_search", "web_scrape"];
  }

  return [];
}

function inferCategory(description: string): AgentCategory {
  const lower = description.toLowerCase();

  if (lower.includes("finance") || lower.includes("pricing") || lower.includes("revenue")) {
    return "finance";
  }
  if (lower.includes("customer") || lower.includes("support")) {
    return "support";
  }
  if (lower.includes("sales") || lower.includes("proposal")) {
    return "business";
  }
  if (
    lower.includes("prd") ||
    lower.includes("spec") ||
    lower.includes("roadmap") ||
    lower.includes("release")
  ) {
    return "product";
  }
  if (
    lower.includes("code") ||
    lower.includes("repo") ||
    lower.includes("bug") ||
    lower.includes("test") ||
    lower.includes("docs")
  ) {
    return "engineering";
  }
  if (lower.includes("market") || lower.includes("research") || lower.includes("competitor")) {
    return "research";
  }
  if (lower.includes("marketing") || lower.includes("seo") || lower.includes("content")) {
    return "marketing";
  }
  return "general";
}

function sanitizeBuilderResponse(
  description: string,
  builderResponse?: Partial<BuilderResponse>
): BuilderResponse {
  const inferredName =
    builderResponse?.name?.trim() ||
    description
      .replace(/^an?\s+agent\s+that\s+/i, "")
      .replace(/^an?\s+/i, "")
      .replace(/\.$/, "")
      .slice(0, 48) ||
    "Custom Agent";

  const inferredSummary =
    builderResponse?.summary?.trim() ||
    `Custom agent for: ${description}`;

  const category = builderResponse?.category ?? inferCategory(description);
  const allowedTools =
    builderResponse?.allowedTools && builderResponse.allowedTools.length > 0
      ? builderResponse.allowedTools
      : inferToolsFromDescription(description);

  const outputShape =
    builderResponse?.outputShape?.trim() ||
    "A well-structured response tailored to the request";

  const tags = Array.from(
    new Set(
      (builderResponse?.tags && builderResponse.tags.length > 0
        ? builderResponse.tags
        : [category, ...description.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 4)]
      )
        .map((tag) => slugify(tag))
        .filter(Boolean)
    )
  );

  const systemPrompt =
    builderResponse?.systemPrompt?.trim() ||
    [
      `You are ${inferredName}, an expert agent specialized in: ${description}.`,
      "",
      "Process:",
      "1. Understand the user's goal and constraints.",
      "2. Use available tools only when they materially improve the output.",
      "3. Produce a concrete, structured response.",
      "",
      `Expected output: ${outputShape}.`,
      "",
      "Rules:",
      "- Be concise but complete.",
      "- State uncertainties clearly instead of inventing facts.",
      "- Prefer actionable outputs over abstract commentary.",
    ].join("\n");

  return {
    name: inferredName,
    summary: inferredSummary,
    category,
    tags,
    allowedTools,
    outputShape,
    systemPrompt,
  };
}

async function generateDefinitionFromDescription(
  description: string
): Promise<BuilderResponse> {
  const config = getConfig();
  const auth = resolveAuth();

  const env: Record<string, string | undefined> = { ...process.env };
  if (auth.oauthToken) {
    env.CLAUDE_CODE_OAUTH_TOKEN = auth.oauthToken;
  } else if (auth.apiKey) {
    env.ANTHROPIC_API_KEY = auth.apiKey;
  }

  let resultText = "";

  try {
    const sdkQuery = query({
      prompt: `${BUILDER_PROMPT}\n\nUser description:\n${description}`,
      options: {
        model: config.defaultModel,
        maxTurns: 1,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        allowedTools: [],
        env,
      },
    });

    for await (const message of sdkQuery) {
      if (message.type === "result" && message.subtype === "success") {
        resultText = message.result;
      }
    }
  } catch {
    resultText = "";
  }

  try {
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? resultText) as Partial<BuilderResponse>;
    return sanitizeBuilderResponse(description, parsed);
  } catch {
    return sanitizeBuilderResponse(description);
  }
}

function buildDefinitionFromSpec(spec: AgentSpec): SavedAgentDefinition {
  const now = new Date().toISOString();
  const name = spec.name?.trim() || spec.task.trim();
  const slug = slugify(name);
  const summary =
    spec.summary?.trim() ||
    `Custom agent for ${spec.task.trim().toLowerCase()}`;
  const category = spec.category ?? inferCategory(spec.task);
  const friendlyTools =
    spec.tools && spec.tools.length > 0 ? spec.tools : inferToolsFromDescription(spec.task);
  const instructions = [
    `You are ${name}, an expert agent for: ${spec.task}.`,
    spec.inputs ? `Expected inputs: ${spec.inputs}` : undefined,
    spec.outputs ? `Expected output format: ${spec.outputs}` : undefined,
    spec.additionalInstructions ? `Additional instructions: ${spec.additionalInstructions}` : undefined,
    "",
    "Process:",
    "1. Understand the task and constraints.",
    "2. Use tools only when they materially improve the result.",
    "3. Return a clear, structured answer.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: slug,
    slug,
    name,
    summary,
    description: formatSpec(spec),
    category,
    tags: Array.from(new Set((spec.tags ?? [category, slug]).map((tag) => slugify(tag)))),
    kind: "custom",
    allowedTools: mapFriendlyToolsToSdk(friendlyTools),
    outputShape: spec.outputs ?? "A well-structured response tailored to the task",
    instructions,
    createdAt: now,
    updatedAt: now,
    source: "structured_spec",
  };
}

function formatSpec(spec: AgentSpec): string {
  let desc = `Task: ${spec.task}`;
  if (spec.inputs) desc += `\nExpected inputs: ${spec.inputs}`;
  if (spec.outputs) desc += `\nExpected outputs: ${spec.outputs}`;
  if (spec.additionalInstructions) {
    desc += `\nAdditional requirements: ${spec.additionalInstructions}`;
  }
  if (spec.tools && spec.tools.length > 0) {
    desc += `\nRequested tools: ${spec.tools.join(", ")}`;
  }
  return desc;
}

function definitionToAgent(definition: SavedAgentDefinition): Agent {
  return new Agent({
    instructions: definition.instructions,
    allowedTools: definition.allowedTools,
    maxLoops: 10,
    maxTokens: 4096,
    temperature: 0.4,
    metadata: {
      id: definition.id,
      slug: definition.slug,
      name: definition.name,
      summary: definition.summary,
      description: definition.description,
      category: definition.category,
      tags: definition.tags,
      kind: definition.kind,
      outputShape: definition.outputShape,
    },
  });
}

export async function createAgent(
  descriptionOrSpec: string | AgentSpec
): Promise<CustomAgent> {
  if (typeof descriptionOrSpec !== "string") {
    return new CustomAgent(buildDefinitionFromSpec(descriptionOrSpec));
  }

  const builder = await generateDefinitionFromDescription(descriptionOrSpec);
  const now = new Date().toISOString();
  const name = builder.name.trim();
  const slug = slugify(name);

  const definition: SavedAgentDefinition = {
    id: slug,
    slug,
    name,
    summary: builder.summary,
    description: descriptionOrSpec,
    category: builder.category,
    tags: builder.tags,
    kind: "custom",
    allowedTools: mapFriendlyToolsToSdk(builder.allowedTools),
    outputShape: builder.outputShape,
    instructions: builder.systemPrompt,
    createdAt: now,
    updatedAt: now,
    source: "generated",
  };

  return new CustomAgent(definition);
}

export async function saveAgent(
  agent: CustomAgent | SavedAgentDefinition,
  baseDir?: string
): Promise<string> {
  const definition = agent instanceof CustomAgent ? agent.definition : agent;
  return persistAgentDefinition(definition, baseDir);
}

export async function loadAgent(
  idOrSlug: string,
  baseDir?: string
): Promise<CustomAgent | null> {
  const definition = await loadAgentDefinition(idOrSlug, baseDir);
  return definition ? new CustomAgent(definition) : null;
}

export async function listSavedAgents(baseDir?: string): Promise<AgentRegistryEntry[]> {
  const definitions = await listSavedAgentDefinitions(baseDir);
  return definitions.map((definition) => toRegistryEntry(definition));
}

export function createAgentFromDefinition(
  definition: SavedAgentDefinition
): CustomAgent {
  return new CustomAgent(definition);
}

export class CustomAgent {
  public readonly definition: SavedAgentDefinition;
  private readonly agent: Agent;

  constructor(definition: SavedAgentDefinition) {
    this.definition = definition;
    this.agent = definitionToAgent(definition);
  }

  get description(): string {
    return this.definition.description ?? this.definition.summary;
  }

  get registryEntry(): AgentRegistryEntry {
    return toRegistryEntry(this.definition);
  }

  async save(baseDir?: string): Promise<string> {
    return persistAgentDefinition(this.definition, baseDir);
  }

  toJSON(): SavedAgentDefinition {
    return this.definition;
  }

  async run(input: string, options?: RunOptions): Promise<AgentResult> {
    return this.agent.run(input, options);
  }
}

export { FRIENDLY_TO_SDK_TOOLS, mapFriendlyToolsToSdk, mapSdkToolsToFriendly };
