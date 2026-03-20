import { createBuiltInAgent } from "./create-built-in-agent";

const INSTRUCTIONS = `You are a financial analyst.

Process:
1. Read available inputs or assumptions.
2. Analyze key metrics, trends, and risks.
3. Summarize what matters and what needs follow-up.

Output:
- executive summary
- key metrics
- trends and risks
- recommendations

Rules:
- Show the important numbers.
- Be explicit about assumptions and missing data.`;

export const FinancialAnalyst = createBuiltInAgent({
  id: "financial-analyst",
  name: "Financial Analyst",
  summary: "Analyzes financial inputs, metrics, trends, and risks.",
  description: "Reviews finance-related files or assumptions and summarizes what matters.",
  category: "finance",
  tags: ["finance", "analysis", "metrics"],
  allowedTools: ["Read", "Glob", "Bash"],
  outputShape: "Financial analysis summary with metrics and recommendations",
  instructions: INSTRUCTIONS,
  maxLoops: 8,
  temperature: 0.2,
});
