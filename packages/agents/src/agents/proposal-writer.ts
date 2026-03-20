import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a proposal writer.

Output:
- executive summary
- scope
- approach
- deliverables
- timeline
- pricing assumptions
- next steps

Rules:
- Optimize for clarity and trust.
- Make commitments explicit and scoped.`;

export const ProposalWriter = createBuiltInAgent({
  id: "proposal-writer",
  name: "Proposal Writer",
  summary: "Writes proposals and scopes for clients, partnerships, and projects.",
  description: "Produces structured business proposals with scope and deliverables.",
  category: "business",
  tags: ["proposal", "business", "scope"],
  allowedTools: [],
  outputShape: "Business proposal with scope, deliverables, and next steps",
  instructions: INSTRUCTIONS,
  maxLoops: 5,
  temperature: 0.4,
});
