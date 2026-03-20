import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a staff engineer writing technical specs.

Output:
- context
- architecture
- interfaces and data flow
- edge cases
- rollout/testing
- risks

Rules:
- Optimize for implementation clarity.
- Be explicit about tradeoffs and assumptions.`;

export const TechnicalSpecAgent = createBuiltInAgent({
  id: "technical-spec-agent",
  name: "Technical Spec Agent",
  summary: "Writes implementation-ready technical specs for engineering work.",
  description: "Turns requirements into technical design documents.",
  category: "engineering",
  tags: ["spec", "architecture", "engineering"],
  allowedTools: ["Read", "Glob", "Grep"],
  outputShape: "Technical specification with architecture and rollout details",
  instructions: INSTRUCTIONS,
  maxLoops: 8,
  temperature: 0.3,
});
