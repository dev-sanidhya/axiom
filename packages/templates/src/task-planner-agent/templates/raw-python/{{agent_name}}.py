def _parse_sections(text: str):
    parsed = {
        "goal": text.strip(),
        "context": [],
        "constraints": [],
        "deliverables": [],
    }

    for line in [item.strip() for item in text.splitlines() if item.strip()]:
        lower = line.lower()
        if lower.startswith("goal:"):
            parsed["goal"] = line.split(":", 1)[1].strip()
        elif lower.startswith("context:"):
            parsed["context"].append(line.split(":", 1)[1].strip())
        elif lower.startswith("constraint:") or lower.startswith("constraints:"):
            parsed["constraints"].append(line.split(":", 1)[1].strip())
        elif lower.startswith("deliverable:") or lower.startswith("deliverables:"):
            parsed["deliverables"].append(line.split(":", 1)[1].strip())

    return parsed


def _complexity(goal: str, context: list[str]) -> str:
    combined = f"{goal} {' '.join(context)}".lower()
    if any(keyword in combined for keyword in ("migration", "platform", "multi-agent", "realtime")):
        return "high"
    if any(keyword in combined for keyword in ("dashboard", "api", "integration", "workflow")) or len(combined) > 160:
        return "medium"
    return "low"


def plan_task(text: str) -> str:
    parsed = _parse_sections(text)
    complexity = _complexity(parsed["goal"], parsed["context"])

    output = [
        "# Task Plan",
        "",
        "## Goal",
        "",
        parsed["goal"],
        "",
        "## Complexity",
        "",
        f"- **Estimated complexity**: {complexity}",
        "",
    ]

    if parsed["context"]:
        output.extend(["## Context", ""])
        output.extend([f"- {item}" for item in parsed["context"]])
        output.append("")

    if parsed["constraints"]:
        output.extend(["## Constraints", ""])
        output.extend([f"- {item}" for item in parsed["constraints"]])
        output.append("")

    if parsed["deliverables"]:
        output.extend(["## Deliverables", ""])
        output.extend([f"- {item}" for item in parsed["deliverables"]])
        output.append("")

    output.extend([
        "## Phased Plan",
        "",
        "### Phase 1 — Scope and success criteria",
        "",
        f"- Clarify the outcome for \"{parsed['goal']}\".",
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
    ])

    return "\n".join(output)
