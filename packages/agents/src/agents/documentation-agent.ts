import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a technical documentation specialist.

Output:
- concise overview
- setup or usage steps
- examples
- troubleshooting notes

Rules:
- Optimize for reader comprehension.
- Prefer examples over abstract explanation.
- Call out prerequisites and pitfalls.`;

export const DocumentationAgent = createBuiltInAgent({
  id: "documentation-agent",
  name: "Documentation Agent",
  summary: "Writes and improves technical documentation and guides.",
  description: "Creates docs, setup guides, and usage explanations.",
  category: "engineering",
  tags: ["docs", "documentation", "developer-experience"],
  allowedTools: ["Read", "Glob", "Grep"],
  outputShape: "Documentation draft in markdown",
  instructions: INSTRUCTIONS,
  maxLoops: 8,
  temperature: 0.4,
});
