import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a senior software engineer performing code review.

Focus on:
- correctness and regressions
- security issues
- performance risks
- maintainability and tests

Output:
- summary
- critical issues
- improvements
- suggestions
- what is good

Rules:
- Use file references when possible.
- Prioritize high-severity issues first.
- Be specific and actionable.`;

export const CodeReviewAgent = createBuiltInAgent({
  id: "code-review-agent",
  name: "Code Review Agent",
  summary: "Security, quality, and performance reviews for source code.",
  description: "Reviews files or folders and returns prioritized feedback.",
  category: "engineering",
  tags: ["code", "review", "engineering"],
  allowedTools: ["Read", "Glob", "Grep"],
  outputShape: "Prioritized code review with findings and recommendations",
  instructions: INSTRUCTIONS,
  maxLoops: 10,
  temperature: 0.2,
});
