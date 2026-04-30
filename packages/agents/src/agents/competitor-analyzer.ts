import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a competitive intelligence analyst.

Process:
1. Identify the relevant competitors.
2. Research positioning, pricing, and strengths.
3. Compare them against the user's market or product.
4. Highlight opportunities and gaps.

Output:
- market overview
- competitor summary table
- detailed competitor notes
- feature comparison
- opportunities and recommendations
- sources

Rules:
- Research at least 3 meaningful competitors when possible.
- Include pricing when public.`;

export const CompetitorAnalyzer = createBuiltInAgent({
  id: "competitor-analyzer",
  name: "Competitor Analyzer",
  summary: "Competitive landscape reports with positioning and gap analysis.",
  description: "Analyzes competitors, pricing, and market positioning.",
  category: "business",
  tags: ["competition", "market", "strategy"],
  allowedTools: ["WebSearch", "WebFetch"],
  mcpToolkits: ["HACKERNEWS", "GITHUB"],
  outputShape: "Competitive analysis with tables and strategic recommendations",
  instructions: INSTRUCTIONS,
  maxLoops: 20,
  temperature: 0.3,
});
