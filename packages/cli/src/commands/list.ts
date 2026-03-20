import chalk from "chalk";
import { getBuiltInAgents } from "@axiom/agents";

export function listAgents(): void {
  const agents = getBuiltInAgents();

  console.log();
  console.log(chalk.bold(`  Built-in Agents (${agents.length})`));
  console.log(
    chalk.gray("  ─────────────────────────────────────────────────────────")
  );
  console.log();

  for (const agent of agents) {
    console.log(`  ${chalk.cyan.bold(agent.name)}`);
    console.log(`  ${chalk.gray(agent.summary)}`);
    console.log(
      `  ${chalk.gray("Category:")} ${chalk.yellow(agent.category)}`
    );
    console.log(
      `  ${chalk.gray("Tools:")} ${
        agent.allowedTools.length > 0
          ? agent.allowedTools.map((tool) => chalk.yellow(tool)).join(", ")
          : chalk.gray("none (pure LLM)")
      }`
    );
    console.log(
      `  ${chalk.gray("Import:")} ${chalk.white(`import { ${agent.name.replace(/\s+/g, "")} } from '@axiom/agents';`)}`
    );
    console.log(
      `  ${chalk.gray("Try:   ")} ${chalk.white(`axiom try ${agent.slug}`)}`
    );
    console.log();
  }

  console.log(
    `  ${chalk.gray("Saved custom agents:")} ${chalk.white("axiom agents")}`
  );
  console.log(
    `  ${chalk.gray("Create a custom agent:")} ${chalk.white("axiom create")}`
  );
  console.log();
}
