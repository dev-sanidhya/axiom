import { configure } from "../../config";
import { getBuiltInAgents } from "../../agents";

jest.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: jest.fn().mockReturnValue(
    (async function* () {
      yield {
        type: "assistant",
        message: {
          content: [{ type: "text", text: "Agent response" }],
        },
      };
      yield {
        type: "result",
        subtype: "success",
        result: "Agent response",
        total_cost_usd: 0.001,
        num_turns: 1,
        usage: { input_tokens: 100, output_tokens: 50 },
      };
    })()
  ),
}));

describe("Pre-built Agents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "test-oauth-token";
    configure({ persistRuns: false });
  });

  afterEach(() => {
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  });

  it("should expose 20 built-in agents", () => {
    const agents = getBuiltInAgents();
    expect(agents).toHaveLength(20);
  });

  it("should expose metadata for every built-in agent", () => {
    const agents = getBuiltInAgents();
    for (const agent of agents) {
      expect(agent.id).toBeTruthy();
      expect(agent.slug).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(Array.isArray(agent.allowedTools)).toBe(true);
    }
  });

  it("should export all built-in agents from the main index", async () => {
    const agents = await import("../../index");
    expect(agents.ResearchAgent).toBeDefined();
    expect(agents.CodeReviewAgent).toBeDefined();
    expect(agents.ContentWriter).toBeDefined();
    expect(agents.DataAnalyst).toBeDefined();
    expect(agents.CompetitorAnalyzer).toBeDefined();
    expect(agents.EmailDrafter).toBeDefined();
    expect(agents.SEOAuditor).toBeDefined();
    expect(agents.BugTriager).toBeDefined();
    expect(agents.PRDWriter).toBeDefined();
    expect(agents.TechnicalSpecAgent).toBeDefined();
    expect(agents.DocumentationAgent).toBeDefined();
    expect(agents.ReleaseNotesAgent).toBeDefined();
    expect(agents.TestPlanAgent).toBeDefined();
    expect(agents.MeetingSummarizer).toBeDefined();
    expect(agents.SalesProspector).toBeDefined();
    expect(agents.ProposalWriter).toBeDefined();
    expect(agents.CustomerSupportAgent).toBeDefined();
    expect(agents.FinancialAnalyst).toBeDefined();
    expect(agents.MarketSizingAgent).toBeDefined();
    expect(agents.CustomerFeedbackSynthesizer).toBeDefined();
  });

  it("should run a representative built-in agent", async () => {
    const { ResearchAgent } = await import("../../agents/research");
    const result = await ResearchAgent.run("test query");
    expect(result.success).toBe(true);
    expect(result.output).toBe("Agent response");
  });
});
