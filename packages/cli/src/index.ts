import { Command } from "commander";
import chalk from "chalk";
import { listAgents } from "./commands/list";
import { tryAgent } from "./commands/try-agent";
import { createAgentCommand } from "./commands/create";
import { initProject } from "./commands/init";
import { listCustomAgents } from "./commands/agents";
import { openDashboard } from "./commands/dashboard";

const program = new Command();

program
  .name("agentos")
  .description("Importable prebuilt agents, a custom agent builder, and a local dashboard")
  .version("0.1.0");

program
  .command("list")
  .description("List all built-in AgentOS agents")
  .action(() => {
    listAgents();
  });

program
  .command("agents")
  .description("List saved custom agents in .agentos/agents")
  .action(async () => {
    await listCustomAgents();
  });

program
  .command("try [agent] [input]")
  .description("Run a built-in agent")
  .option("-i, --input <input>", "Input for the agent")
  .action(async (agent?: string, inputArg?: string, options?: { input?: string }) => {
    const input = options?.input ?? inputArg;
    await tryAgent(agent, input);
  });

program
  .command("create")
  .description("Create, preview, run, and save a custom agent from one description")
  .action(async () => {
    await createAgentCommand();
  });

program
  .command("dashboard")
  .description("Launch the local AgentOS dashboard")
  .option("-p, --port <port>", "Port for the local dashboard", "3210")
  .action(async (options: { port: string }) => {
    await openDashboard(Number(options.port));
  });

program
  .command("init [name]")
  .description("Initialize a new local-first AgentOS project")
  .action(async (name?: string) => {
    await initProject(name);
  });

if (process.argv.length <= 2) {
  console.log();
  console.log(chalk.bold.cyan("  AgentOS") + chalk.gray(" - Local-first AI agents for product teams"));
  console.log();
  program.outputHelp();
  console.log();
} else {
  program.parse();
}
