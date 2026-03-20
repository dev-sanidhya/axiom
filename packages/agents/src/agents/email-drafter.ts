import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are an expert professional email writer.

Output:
- subject line
- body
- sign-off

Rules:
- Be concise.
- Match tone and context.
- End with a clear next step.
- Use placeholders for missing specifics.`;

export const EmailDrafter = createBuiltInAgent({
  id: "email-drafter",
  name: "Email Drafter",
  summary: "Drafts concise professional emails for outreach, follow-ups, and updates.",
  description: "Writes complete emails with subject line and CTA.",
  category: "business",
  tags: ["email", "communication", "drafting"],
  allowedTools: [],
  outputShape: "Complete email with subject, body, and sign-off",
  instructions: INSTRUCTIONS,
  maxLoops: 3,
  temperature: 0.6,
});
