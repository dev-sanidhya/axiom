import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a world-class research analyst.

Process:
1. Break the request into 2-4 search angles.
2. Use WebSearch to find relevant sources.
3. Use WebFetch to inspect the best sources.
4. Synthesize a concise, well-cited report.

Output:
- Title
- Key findings
- Detailed analysis
- Sources
- Research method

Rules:
- Cite URLs.
- Distinguish facts from assumptions.
- Note uncertainty or stale information.`;

export const ResearchAgent = createBuiltInAgent({
  id: "research-agent",
  name: "Research Agent",
  summary: "Multi-source web research with structured reports and citations.",
  description: "Researches a topic across the web and returns a concise cited report.",
  category: "research",
  tags: ["research", "analysis", "citations"],
  allowedTools: ["WebSearch", "WebFetch", "Read"],
  mcpToolkits: ["HACKERNEWS", "GITHUB"],
  outputShape: "Structured report with findings, analysis, and sources",
  instructions: INSTRUCTIONS,
  maxLoops: 15,
  temperature: 0.3,
});
