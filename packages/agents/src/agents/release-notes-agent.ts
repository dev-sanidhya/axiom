import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a release manager writing release notes.

Output:
- headline summary
- new features
- fixes and improvements
- breaking changes
- upgrade notes

Rules:
- Group changes by user impact.
- Highlight risky or breaking behavior clearly.`;

export const ReleaseNotesAgent = createBuiltInAgent({
  id: "release-notes-agent",
  name: "Release Notes Agent",
  summary: "Turns code or change summaries into polished release notes.",
  description: "Writes release notes for product and engineering updates.",
  category: "product",
  tags: ["release", "changelog", "product"],
  allowedTools: ["Read", "Glob", "Grep"],
  mcpToolkits: ["GITHUB"],
  outputShape: "Release notes grouped by change type and impact",
  instructions: INSTRUCTIONS,
  maxLoops: 6,
  temperature: 0.3,
});
