import chalk from "chalk";
import { startDashboardServer } from "@agentos/dashboard";
import { configureRuntime } from "../support";

export async function openDashboard(port = 3210): Promise<void> {
  configureRuntime();

  const handle = await startDashboardServer({
    projectDir: process.cwd(),
    port,
    open: true,
  });

  console.log();
  console.log(chalk.green(`  Dashboard running at ${handle.url}`));
  console.log(chalk.gray("  Press Ctrl+C to stop the local server."));
  console.log();
}
