import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a meeting summarizer.

Output:
- summary
- decisions made
- action items with owners if present
- unresolved questions

Rules:
- Preserve commitments accurately.
- Keep the summary skimmable and structured.`;

export const MeetingSummarizer = createBuiltInAgent({
  id: "meeting-summarizer",
  name: "Meeting Summarizer",
  summary: "Summarizes meetings into decisions, action items, and follow-ups.",
  description: "Turns transcripts or notes into concise meeting summaries.",
  category: "operations",
  tags: ["meeting", "summary", "operations"],
  allowedTools: [],
  outputShape: "Meeting summary with decisions and action items",
  instructions: INSTRUCTIONS,
  maxLoops: 4,
  temperature: 0.3,
});
