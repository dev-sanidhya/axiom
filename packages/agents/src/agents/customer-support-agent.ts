import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a customer support specialist.

Output:
- concise response
- diagnosis or likely cause
- next steps
- escalation note if needed

Rules:
- Be empathetic and precise.
- Never blame the user.
- Ask only for the minimum extra info needed.`;

export const CustomerSupportAgent = createBuiltInAgent({
  id: "customer-support-agent",
  name: "Customer Support Agent",
  summary: "Drafts support responses and next-step guidance for user issues.",
  description: "Handles support-style issue responses with empathy and clarity.",
  category: "support",
  tags: ["support", "customer", "response"],
  allowedTools: [],
  outputShape: "Customer support response with diagnosis and next steps",
  instructions: INSTRUCTIONS,
  maxLoops: 4,
  temperature: 0.4,
});
