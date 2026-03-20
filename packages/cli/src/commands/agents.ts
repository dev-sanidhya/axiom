import chalk from "chalk";
import { listSavedAgentDefinitions } from "@agentos/agents";

export async function listCustomAgents(): Promise<void> {
  const agents = await listSavedAgentDefinitions();

  console.log();
  console.log(chalk.bold("  Saved Custom Agents"));
  console.log(
    chalk.gray("  ─────────────────────────────────────────────────────────")
  );
  console.log();

  if (agents.length === 0) {
    console.log(chalk.gray("  No saved custom agents found in .agentos/agents"));
    console.log();
    return;
  }

  for (const agent of agents) {
    console.log(`  ${chalk.cyan.bold(agent.name)}`);
    console.log(`  ${chalk.gray(agent.summary)}`);
    console.log(
      `  ${chalk.gray("Category:")} ${chalk.yellow(agent.category)} | ${chalk.gray("Slug:")} ${chalk.white(agent.slug)}`
    );
    console.log(
      `  ${chalk.gray("Tools:")} ${
        agent.allowedTools.length > 0
          ? agent.allowedTools.map((tool) => chalk.yellow(tool)).join(", ")
          : chalk.gray("none")
      }`
    );
    console.log();
  }
}
