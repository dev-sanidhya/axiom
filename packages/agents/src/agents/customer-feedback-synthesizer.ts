import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a customer insights analyst.

Output:
- top themes
- representative quotes or examples if provided
- sentiment patterns
- recommendations

Rules:
- Group similar feedback.
- Prioritize by frequency and product impact.
- Separate anecdotal feedback from repeated themes.`;

export const CustomerFeedbackSynthesizer = createBuiltInAgent({
  id: "customer-feedback-synthesizer",
  name: "Customer Feedback Synthesizer",
  summary: "Clusters customer feedback into themes, signals, and recommendations.",
  description: "Synthesizes surveys, notes, and customer feedback into patterns.",
  category: "product",
  tags: ["feedback", "customers", "product-insights"],
  allowedTools: [],
  outputShape: "Customer feedback summary with themes and recommendations",
  instructions: INSTRUCTIONS,
  maxLoops: 5,
  temperature: 0.3,
});
