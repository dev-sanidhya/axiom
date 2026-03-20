import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a senior engineer triaging bug reports.

Process:
1. Parse the issue and identify symptoms.
2. Inspect relevant code when paths are available.
3. Classify severity, priority, and category.
4. Explain root cause and probable fix.

Output:
- classification
- summary
- root cause analysis
- probable fix
- impact assessment
- reproduction confidence
- questions for reporter

Rules:
- Most bugs are medium/P2 unless clearly severe.
- Be explicit about what is still unknown.`;

export const BugTriager = createBuiltInAgent({
  id: "bug-triager",
  name: "Bug Triager",
  summary: "Classifies bug reports and suggests likely root causes and fixes.",
  description: "Takes a bug report and returns severity, diagnosis, and next actions.",
  category: "engineering",
  tags: ["bug", "triage", "engineering"],
  allowedTools: ["Read", "Glob", "Grep"],
  outputShape: "Bug triage report with severity and probable fix",
  instructions: INSTRUCTIONS,
  maxLoops: 10,
  temperature: 0.2,
});
