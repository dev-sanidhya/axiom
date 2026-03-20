import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { createAgent, saveAgent } from "@agentos/agents";
import { configureRuntime } from "../support";

export async function createAgentCommand(): Promise<void> {
  if (!configureRuntime()) {
    return;
  }

  console.log();
  console.log(chalk.bold("  Custom Agent Builder"));
  console.log(
    chalk.gray("  Describe the agent once. AgentOS will generate the config, let you run it, and save it into this project.")
  );
  console.log();

  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "description",
      message: "Describe your custom agent:",
    },
  ]);

  const description = String(answer.description ?? "").trim();
  if (!description) {
    console.log(chalk.red("  No description provided."));
    return;
  }

  const spinner = ora({
    text: chalk.cyan("Generating agent definition..."),
    spinner: "dots",
  }).start();

  try {
    const agent = await createAgent(description);
    spinner.stop();

    console.log();
    console.log(chalk.green(`  Created ${agent.definition.name}`));
    console.log(chalk.gray(`  ${agent.definition.summary}`));
    console.log(
      chalk.gray(
        `  Category: ${agent.definition.category} | Tools: ${
          agent.definition.allowedTools.length > 0
            ? agent.definition.allowedTools.join(", ")
            : "none"
        }`
      )
    );
    console.log(chalk.gray(`  Output: ${agent.definition.outputShape}`));
    console.log();

    const runAnswer = await inquirer.prompt([
      {
        type: "confirm",
        name: "runNow",
        message: "Run it now?",
        default: true,
      },
    ]);

    if (runAnswer.runNow) {
      const inputAnswer = await inquirer.prompt([
        {
          type: "input",
          name: "input",
          message: "Input for the agent:",
        },
      ]);

      const input = String(inputAnswer.input ?? "").trim();
      if (input) {
        const runSpinner = ora({
          text: chalk.cyan("Running custom agent..."),
          spinner: "dots",
        }).start();
        const result = await agent.run(input);
        runSpinner.stop();

        console.log();
        if (result.success) {
          console.log(result.output);
          console.log();
          console.log(
            chalk.gray(
              `  ${result.toolCalls.length} tool calls | ${result.tokensUsed.total} tokens | $${result.cost.toFixed(4)} | ${(result.duration / 1000).toFixed(1)}s`
            )
          );
        } else {
          console.log(chalk.red(`  Error: ${result.error}`));
        }
        console.log();
      }
    }

    const saveAnswer = await inquirer.prompt([
      {
        type: "confirm",
        name: "saveIt",
        message: "Save this agent into .agentos/agents?",
        default: true,
      },
    ]);

    if (saveAnswer.saveIt) {
      const filePath = await saveAgent(agent);
      console.log(chalk.green(`  Saved: ${filePath}`));
      console.log();
    }

    console.log(chalk.gray("  Use in code:"));
    console.log(
      chalk.white("    import { createAgent, loadAgent } from '@agentos/agents';")
    );
    console.log(
      chalk.white(
        `    const agent = await loadAgent('${agent.definition.slug}') ?? await createAgent('${description.replace(/'/g, "\\'")}');`
      )
    );
    console.log(chalk.white("    const result = await agent.run('your input here');"));
    console.log();
  } catch (err) {
    spinner.fail(chalk.red("Failed to create agent."));
    console.log(chalk.red(`  ${err instanceof Error ? err.message : String(err)}`));
  }
}
