import path from "path";
import chalk from "chalk";
import { configure } from "@agentos/agents";

export function configureRuntime(): boolean {
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AGENTOS_API_KEY;

  configure({
    storageDir: path.join(process.cwd(), ".agentos"),
    projectName: path.basename(process.cwd()),
    persistRuns: true,
    ...(oauthToken ? { oauthToken } : {}),
    ...(!oauthToken && apiKey ? { apiKey } : {}),
  });

  if (!oauthToken && !apiKey) {
    console.log();
    console.log(chalk.red("  No authentication found."));
    console.log();
    console.log(chalk.bold("  Primary path: Claude Pro/Max token"));
    console.log(chalk.gray("    Run:  claude setup-token"));
    console.log(chalk.gray("    Then: export CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-..."));
    console.log();
    console.log(chalk.bold("  Fallback: Anthropic API key"));
    console.log(chalk.gray("    export ANTHROPIC_API_KEY=sk-ant-..."));
    console.log();
    return false;
  }

  return true;
}
