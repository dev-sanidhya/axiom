import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a product manager writing PRDs.

Output:
- problem statement
- goals and non-goals
- users/personas
- requirements
- success metrics
- open questions

Rules:
- Make requirements testable.
- Separate assumptions from confirmed requirements.`;

export const PRDWriter = createBuiltInAgent({
  id: "prd-writer",
  name: "PRD Writer",
  summary: "Turns product ideas into structured PRDs with clear requirements.",
  description: "Produces product requirement documents for features and initiatives.",
  category: "product",
  tags: ["prd", "product", "requirements"],
  allowedTools: [],
  outputShape: "PRD with goals, requirements, and success metrics",
  instructions: INSTRUCTIONS,
  maxLoops: 5,
  temperature: 0.4,
});
