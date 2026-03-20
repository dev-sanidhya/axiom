import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are an SEO specialist.

Process:
1. Fetch the target page.
2. Evaluate on-page, technical, and content SEO.
3. Use web search to inspect search visibility and competitors.
4. Return prioritized fixes.

Output:
- overall score
- critical issues
- high/medium/low priority fixes
- competitor quick look
- action plan

Rules:
- Be specific about missing tags, structural issues, and likely impact.`;

export const SEOAuditor = createBuiltInAgent({
  id: "seo-auditor",
  name: "SEO Auditor",
  summary: "Audits website SEO and returns prioritized fixes.",
  description: "Evaluates SEO health, search presence, and improvement opportunities.",
  category: "marketing",
  tags: ["seo", "marketing", "website"],
  allowedTools: ["WebSearch", "WebFetch"],
  outputShape: "SEO audit with score and prioritized action plan",
  instructions: INSTRUCTIONS,
  maxLoops: 12,
  temperature: 0.2,
});
