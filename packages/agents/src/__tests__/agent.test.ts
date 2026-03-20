import { Agent } from "../agent";
import { configure } from "../config";
import os from "os";
import fs from "fs/promises";
import path from "path";

// Helper to create an async generator from an array of messages
function createMockQuery(messages: unknown[]) {
  return async function* () {
    for (const msg of messages) {
      yield msg;
    }
  };
}

// Mock the Claude Agent SDK
jest.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: jest.fn(),
}));

const getQueryMock = () => {
  return require("@anthropic-ai/claude-agent-sdk").query as jest.Mock;
};

describe("Agent", () => {
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set env so resolveAuth doesn't throw
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "test-oauth-token";
    configure({ persistRuns: false });
  });

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "axiom-run-"));
  });

  afterEach(async () => {
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("should create an agent with config", () => {
      const agent = new Agent({
        instructions: "You are a test agent.",
        allowedTools: ["Read", "WebSearch"],
      });
      expect(agent).toBeInstanceOf(Agent);
    });

    it("should create an agent with no tools", () => {
      const agent = new Agent({
        instructions: "You are a test agent.",
      });
      expect(agent).toBeInstanceOf(Agent);
    });
  });

  describe("run()", () => {
    it("should return a result with the expected shape", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "assistant",
            message: {
              content: [{ type: "text", text: "Hello, world!" }],
            },
          },
          {
            type: "result",
            subtype: "success",
            result: "Hello, world!",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 100, output_tokens: 50 },
          },
        ])()
      );

      const agent = new Agent({
        instructions: "You are a test agent.",
      });

      const result = await agent.run("Say hello");

      expect(result).toMatchObject({
        output: "Hello, world!",
        success: true,
        loops: 1,
      });
      expect(result.tokensUsed.input).toBe(100);
      expect(result.tokensUsed.output).toBe(50);
      expect(result.tokensUsed.total).toBe(150);
      expect(result.cost).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should record tool calls from assistant messages", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "assistant",
            message: {
              content: [
                {
                  type: "tool_use",
                  name: "WebSearch",
                  input: { query: "test query" },
                },
              ],
            },
          },
          {
            type: "assistant",
            message: {
              content: [{ type: "text", text: "Final answer" }],
            },
          },
          {
            type: "result",
            subtype: "success",
            result: "Final answer",
            total_cost_usd: 0.002,
            num_turns: 2,
            usage: { input_tokens: 150, output_tokens: 80 },
          },
        ])()
      );

      const agent = new Agent({
        instructions: "Test agent",
        allowedTools: ["WebSearch"],
      });

      const result = await agent.run("Search for something");

      expect(result.success).toBe(true);
      expect(result.output).toBe("Final answer");
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].tool).toBe("WebSearch");
    });

    it("should handle error results", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "result",
            subtype: "error_max_turns",
            total_cost_usd: 0.05,
            num_turns: 10,
            usage: { input_tokens: 500, output_tokens: 200 },
            errors: ["Max turns reached"],
          },
        ])()
      );

      const agent = new Agent({
        instructions: "Test",
        maxLoops: 10,
      });

      const result = await agent.run("Loop forever");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Max turns reached");
    });

    it("should handle SDK exceptions gracefully", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockImplementation(() => {
        throw new Error("SDK subprocess failed");
      });

      const agent = new Agent({ instructions: "Test" });
      const result = await agent.run("Test");

      expect(result.success).toBe(false);
      expect(result.error).toContain("SDK subprocess failed");
    });

    it("should add context when provided", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "result",
            subtype: "success",
            result: "Done",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 10, output_tokens: 10 },
          },
        ])()
      );

      const agent = new Agent({ instructions: "Test" });
      await agent.run("Do thing", { context: "Extra context here" });

      const callArgs = mockQuery.mock.calls[0][0];
      expect(callArgs.prompt).toContain("Extra context here");
    });

    it("should add output format instructions", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "result",
            subtype: "success",
            result: "{}",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 10, output_tokens: 10 },
          },
        ])()
      );

      const agent = new Agent({ instructions: "Test" });
      await agent.run("Give JSON", { outputFormat: "json" });

      const callArgs = mockQuery.mock.calls[0][0];
      expect(callArgs.prompt).toContain("valid JSON");
    });

    it("should pass model to SDK options", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "result",
            subtype: "success",
            result: "Done",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 10, output_tokens: 10 },
          },
        ])()
      );

      const agent = new Agent({
        instructions: "Test",
        model: "claude-sonnet-4-6",
      });
      await agent.run("Test");

      const callArgs = mockQuery.mock.calls[0][0];
      expect(callArgs.options.model).toBe("claude-sonnet-4-6");
    });

    it("should pass allowedTools to SDK options", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "result",
            subtype: "success",
            result: "Done",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 10, output_tokens: 10 },
          },
        ])()
      );

      const agent = new Agent({
        instructions: "Test",
        allowedTools: ["Read", "Glob"],
      });
      await agent.run("Test");

      const callArgs = mockQuery.mock.calls[0][0];
      expect(callArgs.options.allowedTools).toEqual(["Read", "Glob"]);
    });

    it("should pass system prompt to SDK options", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "result",
            subtype: "success",
            result: "Done",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 10, output_tokens: 10 },
          },
        ])()
      );

      const agent = new Agent({ instructions: "You are a researcher." });
      await agent.run("Test");

      const callArgs = mockQuery.mock.calls[0][0];
      expect(callArgs.options.systemPrompt).toBe("You are a researcher.");
    });

    it("should pass OAuth token via env", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "result",
            subtype: "success",
            result: "Done",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 10, output_tokens: 10 },
          },
        ])()
      );

      const agent = new Agent({ instructions: "Test" });
      await agent.run("Test");

      const callArgs = mockQuery.mock.calls[0][0];
      expect(callArgs.options.env.CLAUDE_CODE_OAUTH_TOKEN).toBe(
        "test-oauth-token"
      );
    });

    it("should persist run records with auth mode when enabled", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "result",
            subtype: "success",
            result: "Persist me",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 10, output_tokens: 10 },
          },
        ])()
      );

      configure({
        storageDir: tempDir,
        projectName: "test-project",
        persistRuns: true,
      });

      const agent = new Agent({
        instructions: "Test",
        metadata: {
          id: "persisted-agent",
          slug: "persisted-agent",
          name: "Persisted Agent",
          summary: "Test summary",
          category: "general",
          tags: ["test"],
          kind: "custom",
        },
      });
      await agent.run("Test");

      const runFiles = await fs.readdir(path.join(tempDir, "runs"));
      expect(runFiles).toHaveLength(1);

      const persisted = JSON.parse(
        await fs.readFile(path.join(tempDir, "runs", runFiles[0]), "utf8")
      );
      expect(persisted.authMode).toBe("oauth_token");
      expect(persisted.agent.name).toBe("Persisted Agent");
    });

    it("should enforce concurrency limits", async () => {
      configure({ maxConcurrentRuns: 1 });

      const mockQuery = getQueryMock();

      // First run: block forever (never resolves)
      let resolveFirst: () => void;
      const blockingPromise = new Promise<void>((r) => {
        resolveFirst = r;
      });

      mockQuery.mockReturnValueOnce(
        (async function* () {
          await blockingPromise;
          yield {
            type: "result",
            subtype: "success",
            result: "Done",
            total_cost_usd: 0,
            num_turns: 1,
            usage: { input_tokens: 0, output_tokens: 0 },
          };
        })()
      );

      const agent = new Agent({ instructions: "Test" });
      const run1 = agent.run("First");

      // Give the first run a tick to start
      await new Promise((r) => setTimeout(r, 10));

      // Second run should be rejected due to concurrency limit
      mockQuery.mockReturnValueOnce(
        createMockQuery([
          {
            type: "result",
            subtype: "success",
            result: "Second",
            total_cost_usd: 0,
            num_turns: 1,
            usage: { input_tokens: 0, output_tokens: 0 },
          },
        ])()
      );

      const result2 = await agent.run("Second");
      expect(result2.success).toBe(false);
      expect(result2.error).toContain("Max concurrent runs");

      // Clean up
      resolveFirst!();
      await run1;
    });

    it("should accept onProgress option without crashing", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReset();
      const progressEvents: unknown[] = [];

      mockQuery.mockImplementation(() => {
        return (async function* () {
          yield {
            type: "assistant",
            message: {
              content: [{ type: "text", text: "Working..." }],
            },
          };
          yield {
            type: "result",
            subtype: "success",
            result: "Done",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 10, output_tokens: 10 },
          };
        })();
      });

      const agent = new Agent({ instructions: "Test" });
      const result = await agent.run("Test", {
        onProgress: (event) => progressEvents.push(event),
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe("Done");
      // Verify query was called
      expect(mockQuery).toHaveBeenCalledTimes(1);
      // Verify options passed include onProgress
      expect(progressEvents.length).toBeGreaterThan(0);
    });
  });

  describe("stream()", () => {
    it("should yield streaming events", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockReturnValue(
        createMockQuery([
          {
            type: "assistant",
            message: {
              content: [{ type: "text", text: "Streaming..." }],
            },
          },
          {
            type: "result",
            subtype: "success",
            result: "Streaming...",
            total_cost_usd: 0.001,
            num_turns: 1,
            usage: { input_tokens: 10, output_tokens: 10 },
          },
        ])()
      );

      const agent = new Agent({ instructions: "Test" });
      const events: unknown[] = [];

      for await (const event of agent.stream("Test")) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0]).toHaveProperty("type", "text_delta");
      expect(events[events.length - 1]).toHaveProperty("type", "done");
    });

    it("should handle stream errors", async () => {
      const mockQuery = getQueryMock();
      mockQuery.mockImplementation(() => {
        throw new Error("Stream failed");
      });

      const agent = new Agent({ instructions: "Test" });
      const events: unknown[] = [];

      for await (const event of agent.stream("Test")) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty("type", "error");
    });
  });
});
