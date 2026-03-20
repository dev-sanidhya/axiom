import { AgentDefinition } from '@agent-platform/core';

interface ParsedPlanningInput {
  goal: string;
  context: string[];
  constraints: string[];
  deliverables: string[];
}

function parsePlanningInput(input: string): ParsedPlanningInput {
  const lines = input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const parsed: ParsedPlanningInput = {
    goal: input.trim(),
    context: [],
    constraints: [],
    deliverables: [],
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('goal:')) {
      parsed.goal = line.slice(5).trim();
    } else if (lower.startsWith('context:')) {
      parsed.context.push(line.slice(8).trim());
    } else if (lower.startsWith('constraint:') || lower.startsWith('constraints:')) {
      parsed.constraints.push(line.split(':').slice(1).join(':').trim());
    } else if (lower.startsWith('deliverable:') || lower.startsWith('deliverables:')) {
      parsed.deliverables.push(line.split(':').slice(1).join(':').trim());
    }
  }

  return parsed;
}

function inferComplexity(goal: string, context: string[]): 'low' | 'medium' | 'high' {
  const combined = `${goal} ${context.join(' ')}`.toLowerCase();
  const highSignals = ['migration', 'multi-agent', 'distributed', 'realtime', 'platform', 'marketplace'];
  const mediumSignals = ['dashboard', 'api', 'workflow', 'integration', 'automation', 'analytics'];

  if (highSignals.some(signal => combined.includes(signal))) {
    return 'high';
  }

  if (mediumSignals.some(signal => combined.includes(signal)) || combined.length > 160) {
    return 'medium';
  }

  return 'low';
}

function buildWorkstreams(goal: string): string[] {
  const lower = goal.toLowerCase();
  const workstreams = ['requirements', 'implementation', 'validation'];

  if (lower.includes('api') || lower.includes('backend')) {
    workstreams.push('integration');
  }

  if (lower.includes('ui') || lower.includes('dashboard') || lower.includes('frontend')) {
    workstreams.push('experience');
  }

  if (lower.includes('data') || lower.includes('report')) {
    workstreams.push('data-shaping');
  }

  if (lower.includes('deploy') || lower.includes('release')) {
    workstreams.push('launch');
  }

  return Array.from(new Set(workstreams));
}

function buildPlan(input: ParsedPlanningInput): string {
  const complexity = inferComplexity(input.goal, input.context);
  const workstreams = buildWorkstreams(input.goal);

  const phases = [
    {
      title: 'Phase 1 — Scope and success criteria',
      tasks: [
        `Clarify the outcome for "${input.goal}".`,
        'Capture assumptions, dependencies, and non-goals.',
        'Define acceptance criteria that are objectively testable.',
      ],
    },
    {
      title: 'Phase 2 — Design and breakdown',
      tasks: [
        `Break the work into ${workstreams.join(', ')} workstreams.`,
        'Sequence the work so dependencies are resolved early.',
        'Choose the smallest viable milestone for the first deliverable.',
      ],
    },
    {
      title: 'Phase 3 — Execution',
      tasks: [
        'Implement the critical path first.',
        'Keep supporting tasks parallel where possible.',
        'Review progress against acceptance criteria after each milestone.',
      ],
    },
    {
      title: 'Phase 4 — Validation and handoff',
      tasks: [
        'Test the most failure-prone scenarios first.',
        'Document operating assumptions and follow-up work.',
        'Prepare a concise release or handoff checklist.',
      ],
    },
  ];

  let report = `# Task Plan\n\n`;
  report += `## Goal\n\n${input.goal}\n\n`;
  report += `## Complexity\n\n- **Estimated complexity**: ${complexity}\n`;
  report += `- **Suggested workstreams**: ${workstreams.join(', ')}\n\n`;

  if (input.context.length > 0) {
    report += `## Context\n\n`;
    input.context.forEach(item => {
      report += `- ${item}\n`;
    });
    report += `\n`;
  }

  if (input.constraints.length > 0) {
    report += `## Constraints\n\n`;
    input.constraints.forEach(item => {
      report += `- ${item}\n`;
    });
    report += `\n`;
  }

  if (input.deliverables.length > 0) {
    report += `## Deliverables\n\n`;
    input.deliverables.forEach(item => {
      report += `- ${item}\n`;
    });
    report += `\n`;
  }

  report += `## Phased Plan\n\n`;
  phases.forEach(phase => {
    report += `### ${phase.title}\n\n`;
    phase.tasks.forEach(task => {
      report += `- ${task}\n`;
    });
    report += `\n`;
  });

  report += `## Risks\n\n`;
  report += `- Hidden dependencies can delay execution unless they are surfaced in Phase 1.\n`;
  report += `- Validation work gets squeezed if milestones are not explicitly time-boxed.\n`;
  if (complexity === 'high') {
    report += `- The goal is large enough that it likely needs staged delivery rather than a single-pass implementation.\n`;
  }
  report += `\n## Done Criteria\n\n`;
  report += `- Scope is clear and approved.\n`;
  report += `- The main deliverable is implemented.\n`;
  report += `- Validation passes for the critical path.\n`;
  report += `- Follow-up work is documented.\n\n`;
  report += `---\n*Plan generated by Agent Platform Task Planner Agent*\n`;

  return report;
}

const taskPlannerAgent: AgentDefinition = {
  name: 'task-planner-agent',
  version: '1.0.0',
  description: 'Turns a goal into a phased execution plan with risks and done criteria',
  author: 'Agent Platform',
  tags: ['planning', 'project-management', 'execution', 'roadmap'],
  systemPrompt: `You are a delivery-focused planning assistant. Break goals into clear phases, keep scope explicit, and bias toward plans that can actually be executed.`,
  tools: [],
  config: {
    model: 'claude-sonnet-4',
    provider: 'anthropic',
    temperature: 0.3,
    maxTokens: 3000,
  },
  async execute(input: string): Promise<string> {
    return buildPlan(parsePlanningInput(input));
  },
};

export default taskPlannerAgent;
