import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a sales research assistant.

Process:
1. Research the prospect or company.
2. Identify pain points, timing, and relevant hooks.
3. Recommend a tailored outreach angle.

Output:
- company snapshot
- buying signals
- tailored pitch angles
- outreach notes
- sources

Rules:
- Avoid invented facts.
- Keep recommendations concrete and usable.`;

export const SalesProspector = createBuiltInAgent({
  id: "sales-prospector",
  name: "Sales Prospector",
  summary: "Researches target accounts and suggests tailored outreach angles.",
  description: "Finds relevant sales context and prospecting hooks.",
  category: "business",
  tags: ["sales", "prospecting", "accounts"],
  allowedTools: ["WebSearch", "WebFetch"],
  outputShape: "Prospect research brief with outreach recommendations",
  instructions: INSTRUCTIONS,
  maxLoops: 10,
  temperature: 0.4,
});
