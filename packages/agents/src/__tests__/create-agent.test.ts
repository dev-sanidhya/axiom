import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  createAgent,
  CustomAgent,
  loadAgent,
  saveAgent,
  listSavedAgents,
} from "../create-agent";
import { configure } from "../config";

jest.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: jest.fn(),
}));

const getQueryMock = () => {
  return require("@anthropic-ai/claude-agent-sdk").query as jest.Mock;
};

describe("createAgent", () => {
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "test-oauth-token";
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "axiom-builder-"));
    configure({
      storageDir: tempDir,
      persistRuns: false,
    });

    const mockQuery = getQueryMock();
    mockQuery.mockReturnValue(
      (async function* () {
        yield {
          type: "result",
          subtype: "success",
          result: JSON.stringify({
            name: "News Summarizer",
            summary: "Summarizes news with sources",
            category: "research",
            tags: ["news", "research"],
            allowedTools: ["web_search", "web_scrape"],
            outputShape: "Bullet summary with sources",
            systemPrompt: "You are a helpful assistant for summarizing news.",
          }),
          total_cost_usd: 0.001,
          num_turns: 1,
          usage: { input_tokens: 100, output_tokens: 200 },
        };
      })()
    );
  });

  afterEach(async () => {
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should create a custom agent with inferred metadata", async () => {
    const agent = await createAgent("An agent that summarizes news articles");
    expect(agent).toBeInstanceOf(CustomAgent);
    expect(agent.definition.name).toBe("News Summarizer");
    expect(agent.definition.allowedTools).toEqual(["WebSearch", "WebFetch"]);
    expect(agent.definition.category).toBe("research");
  });

  it("should build directly from a structured spec with real tools", async () => {
    const mockQuery = getQueryMock();
    const agent = await createAgent({
      task: "Analyze CSV files",
      inputs: "CSV file path",
      outputs: "Summary statistics",
      tools: ["read_file", "bash"],
    });

    expect(mockQuery).not.toHaveBeenCalled();
    expect(agent.definition.allowedTools).toEqual(["Read", "Bash"]);
    expect(agent.description).toContain("Task: Analyze CSV files");
  });

  it("should save and load a custom agent definition", async () => {
    const agent = await createAgent("An agent that summarizes news articles");
    await saveAgent(agent, tempDir);

    const loaded = await loadAgent(agent.definition.slug, tempDir);
    expect(loaded).not.toBeNull();
    expect(loaded?.definition.name).toBe(agent.definition.name);

    const savedAgents = await listSavedAgents(tempDir);
    expect(savedAgents).toHaveLength(1);
    expect(savedAgents[0].kind).toBe("custom");
  });

  it("should use fallback metadata when SDK returns invalid JSON", async () => {
    const mockQuery = getQueryMock();
    mockQuery.mockReturnValue(
      (async function* () {
        yield {
          type: "result",
          subtype: "success",
          result: "not valid json at all",
          total_cost_usd: 0.001,
          num_turns: 1,
          usage: { input_tokens: 10, output_tokens: 10 },
        };
      })()
    );

    const agent = await createAgent("A finance agent that reviews pricing");
    expect(agent).toBeInstanceOf(CustomAgent);
    expect(agent.definition.name).toBeTruthy();
    expect(agent.definition.category).toBe("finance");
  });

  it("should use fallback metadata when SDK throws", async () => {
    const mockQuery = getQueryMock();
    mockQuery.mockImplementation(() => {
      throw new Error("SDK failed");
    });

    const agent = await createAgent("A test agent");
    expect(agent).toBeInstanceOf(CustomAgent);
    expect(agent.definition.name).toBeTruthy();
  });
});
