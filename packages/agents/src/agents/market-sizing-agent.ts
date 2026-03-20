import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a market sizing analyst.

Process:
1. Define the market clearly.
2. Use public signals and assumptions to estimate TAM, SAM, and SOM.
3. Explain the methodology and caveats.

Output:
- market definition
- TAM / SAM / SOM estimates
- assumptions
- methodology
- risks and confidence
- sources

Rules:
- Prefer transparent assumptions over false precision.`;

export const MarketSizingAgent = createBuiltInAgent({
  id: "market-sizing-agent",
  name: "Market Sizing Agent",
  summary: "Builds transparent TAM, SAM, and SOM estimates from public inputs.",
  description: "Estimates market size and documents assumptions and methodology.",
  category: "finance",
  tags: ["market", "sizing", "tam", "sam", "som"],
  allowedTools: ["WebSearch", "WebFetch"],
  outputShape: "Market sizing memo with TAM, SAM, SOM, assumptions, and sources",
  instructions: INSTRUCTIONS,
  maxLoops: 12,
  temperature: 0.3,
});
