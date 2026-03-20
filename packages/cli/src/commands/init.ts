import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import inquirer from "inquirer";

export async function initProject(name?: string): Promise<void> {
  if (!name) {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Project name:",
        default: "my-axiom-project",
      },
    ]);
    name = answer.projectName;
  }

  const projectDir = path.resolve(name!);
  if (fs.existsSync(projectDir)) {
    console.log(chalk.red(`  Directory ${name} already exists.`));
    return;
  }

  console.log();
  console.log(chalk.cyan(`  Creating ${name}...`));

  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(path.join(projectDir, ".axiom", "agents"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, ".axiom", "runs"), { recursive: true });

  const pkg = {
    name,
    version: "0.1.0",
    private: true,
    scripts: {
      start: "ts-node index.ts",
      dashboard: "axiom dashboard",
    },
    dependencies: {
      "@axiom/agents": "^0.1.0",
      "dotenv": "^16.6.1",
    },
    devDependencies: {
      "@types/node": "^20.11.0",
      "ts-node": "^10.9.2",
      "typescript": "^5.3.3",
    },
  };

  fs.writeFileSync(
    path.join(projectDir, "package.json"),
    JSON.stringify(pkg, null, 2)
  );

  fs.writeFileSync(
    path.join(projectDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "commonjs",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
        },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(projectDir, ".env"),
    [
      "# Primary auth path: Claude Pro/Max token",
      "# Run: claude setup-token",
      "CLAUDE_CODE_OAUTH_TOKEN=",
      "",
      "# Fallback: Anthropic API key",
      "# ANTHROPIC_API_KEY=",
      "",
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(projectDir, ".gitignore"),
    ["node_modules/", "dist/", ".env", ".axiom/runs/"].join("\n")
  );

  const example = `import "dotenv/config";
import {
  ResearchAgent,
  PRDWriter,
  createAgent,
  loadAgent,
  configure,
} from "@axiom/agents";

configure({
  oauthToken: process.env.CLAUDE_CODE_OAUTH_TOKEN,
});

async function main() {
  const research = await ResearchAgent.run("Compare the top AI agent frameworks for shipping product features.");
  console.log(research.output);

  const prd = await PRDWriter.run("Create a PRD for a local dashboard that shows run history and saved agents.");
  console.log(prd.output);

  const custom =
    (await loadAgent("my-agent")) ??
    (await createAgent("An agent that summarizes customer interview notes into themes and action items"));

  console.log(custom.definition.name);
}

main().catch(console.error);
`;

  fs.writeFileSync(path.join(projectDir, "index.ts"), example);

  console.log(chalk.green("  Done!"));
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log(chalk.gray(`    cd ${name}`));
  console.log(chalk.gray("    npm install"));
  console.log(chalk.gray("    claude setup-token"));
  console.log(chalk.gray("    # add CLAUDE_CODE_OAUTH_TOKEN to .env"));
  console.log(chalk.gray("    npx ts-node index.ts"));
  console.log(chalk.gray("    axiom dashboard"));
  console.log();
}
