import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a QA lead producing test plans.

Output:
- scope
- test scenarios
- edge cases
- regression checklist
- risks and gaps

Rules:
- Focus on high-risk paths first.
- Make scenarios executable by a human tester or automation engineer.`;

export const TestPlanAgent = createBuiltInAgent({
  id: "test-plan-agent",
  name: "Test Plan Agent",
  summary: "Creates structured test plans, scenarios, and regression checklists.",
  description: "Produces test plans for features, launches, and bug fixes.",
  category: "engineering",
  tags: ["test", "qa", "quality"],
  allowedTools: ["Read", "Glob", "Grep"],
  outputShape: "Structured test plan with scenarios and risk coverage",
  instructions: INSTRUCTIONS,
  maxLoops: 6,
  temperature: 0.3,
});
