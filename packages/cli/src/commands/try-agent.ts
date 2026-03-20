import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { getBuiltInAgentById, getBuiltInAgents } from "@agentos/agents";
import { configureRuntime } from "../support";

function resolveAgent(alias?: string) {
  if (!alias) {
    return null;
  }

  const normalized = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidates = getBuiltInAgents();

  return (
    candidates.find((agent) => {
      const compactName = agent.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const compactSlug = agent.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
      return compactName === normalized || compactSlug === normalized;
    }) ?? null
  );
}

export async function tryAgent(agentName?: string, input?: string): Promise<void> {
  if (!configureRuntime()) {
    return;
  }

  let selected = resolveAgent(agentName);
  if (!selected) {
    const builtIn = getBuiltInAgents();
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "agentId",
        message: "Which built-in agent do you want to run?",
        pageSize: 20,
        choices: builtIn.map((agent) => ({
          name: `${agent.name} — ${agent.summary}`,
          value: agent.id,
        })),
      },
    ]);
    selected = getBuiltInAgentById(answer.agentId)?.definition ?? null;
  }

  if (!selected) {
    console.log(chalk.red(`  Unknown agent: ${agentName}`));
    return;
  }

  if (!input) {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "userInput",
        message: "What should the agent do?",
      },
    ]);
    input = answer.userInput;
  }

  if (!input?.trim()) {
    console.log(chalk.red("  No input provided."));
    return;
  }

  const runtimeAgent = getBuiltInAgentById(selected.id);
  if (!runtimeAgent) {
    console.log(chalk.red("  Agent runtime could not be resolved."));
    return;
  }

  console.log();
  const spinner = ora({
    text: chalk.cyan(`Running ${selected.name}...`),
    spinner: "dots",
  }).start();

  try {
    const result = await runtimeAgent.run(input);
    spinner.stop();

    if (!result.success) {
      console.log();
      console.log(chalk.red(`  Error: ${result.error}`));
      console.log();
      return;
    }

    console.log();
    console.log(result.output);
    console.log();
    console.log(
      chalk.gray(
        `  ${result.toolCalls.length} tool calls | ${result.tokensUsed.total} tokens | $${result.cost.toFixed(4)} | ${(result.duration / 1000).toFixed(1)}s | ${result.loops} loops`
      )
    );
    console.log();
  } catch (err) {
    spinner.stop();
    console.log();
    console.log(chalk.red(`  Error: ${err instanceof Error ? err.message : String(err)}`));
    console.log();
  }
}
