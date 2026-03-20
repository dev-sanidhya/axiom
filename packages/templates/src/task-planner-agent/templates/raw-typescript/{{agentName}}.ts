interface PlanningInput {
  goal: string;
  context: string[];
  constraints: string[];
  deliverables: string[];
}

function parseSections(text: string): PlanningInput {
  const parsed: PlanningInput = {
    goal: text.trim(),
    context: [],
    constraints: [],
    deliverables: [],
  };

  for (const line of text.split(/\r?\n/).map(item => item.trim()).filter(Boolean)) {
    const lower = line.toLowerCase();
    if (lower.startsWith("goal:")) {
      parsed.goal = line.split(":").slice(1).join(":").trim();
    } else if (lower.startsWith("context:")) {
      parsed.context.push(line.split(":").slice(1).join(":").trim());
    } else if (lower.startsWith("constraint:") || lower.startsWith("constraints:")) {
      parsed.constraints.push(line.split(":").slice(1).join(":").trim());
    } else if (lower.startsWith("deliverable:") || lower.startsWith("deliverables:")) {
      parsed.deliverables.push(line.split(":").slice(1).join(":").trim());
    }
  }

  return parsed;
}

function inferComplexity(goal: string, context: string[]): "low" | "medium" | "high" {
  const combined = `${goal} ${context.join(" ")}`.toLowerCase();
  if (["migration", "platform", "multi-agent", "realtime"].some(keyword => combined.includes(keyword))) {
    return "high";
  }
  if (["dashboard", "api", "integration", "workflow"].some(keyword => combined.includes(keyword)) || combined.length > 160) {
    return "medium";
  }
  return "low";
}

export function planTask(text: string): string {
  const parsed = parseSections(text);
  const complexity = inferComplexity(parsed.goal, parsed.context);

  const lines: string[] = [
    "# Task Plan",
    "",
    "## Goal",
    "",
    parsed.goal,
    "",
    "## Complexity",
    "",
    `- **Estimated complexity**: ${complexity}`,
    "",
  ];

  if (parsed.context.length > 0) {
    lines.push("## Context", "");
    parsed.context.forEach(item => lines.push(`- ${item}`));
    lines.push("");
  }

  if (parsed.constraints.length > 0) {
    lines.push("## Constraints", "");
    parsed.constraints.forEach(item => lines.push(`- ${item}`));
    lines.push("");
  }

  if (parsed.deliverables.length > 0) {
    lines.push("## Deliverables", "");
    parsed.deliverables.forEach(item => lines.push(`- ${item}`));
    lines.push("");
  }

  lines.push(
    "## Phased Plan",
    "",
    "### Phase 1 — Scope and success criteria",
    "",
    `- Clarify the outcome for "${parsed.goal}".`,
    "- Capture assumptions and non-goals.",
    "- Define acceptance criteria that are objectively testable.",
    "",
    "### Phase 2 — Design and breakdown",
    "",
    "- Break the work into the smallest independently deliverable tasks.",
    "- Sequence the work so dependencies are resolved early.",
    "- Choose the smallest milestone that proves the plan is viable.",
    "",
    "### Phase 3 — Execution",
    "",
    "- Implement the critical path first.",
    "- Keep support work parallel where possible.",
    "- Review progress against acceptance criteria after each milestone.",
    "",
    "### Phase 4 — Validation and handoff",
    "",
    "- Test the most failure-prone scenarios first.",
    "- Document remaining follow-up work.",
    "- Prepare a concise release or handoff checklist.",
    "",
    "## Risks",
    "",
    "- Hidden dependencies can delay execution unless they are surfaced in Phase 1.",
    "- Validation work gets squeezed if milestones are not explicitly time-boxed.",
    "",
    "## Done Criteria",
    "",
    "- Scope is clear and approved.",
    "- Main deliverable is implemented.",
    "- Validation passes for the critical path.",
    "- Follow-up work is documented."
  );

  return lines.join("\n");
}
