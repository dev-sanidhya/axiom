import { promises as fs } from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { cosmiconfig } from 'cosmiconfig';
import { AgentDefinition, AgentConfig } from '@agent-platform/core';

const explorer = cosmiconfig('agent');
const requireFromHere = createRequire(__filename);
let tsNodeRegistered = false;

/**
 * Load agent configuration from agent.config.js/ts
 */
export async function loadConfig(): Promise<AgentConfig | null> {
  try {
    const result = await explorer.search();
    return result ? result.config : null;
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

/**
 * Load an agent by name from the agents/ directory
 */
export async function loadAgent(agentName: string): Promise<AgentDefinition | null> {
  const agentsDir = path.join(process.cwd(), 'agents');
  let lastLoadError: unknown;

  // Try different file extensions
  const extensions = ['.ts', '.js', '.agent.ts', '.agent.js'];

  for (const ext of extensions) {
    const agentPath = path.join(agentsDir, agentName + ext);

    try {
      await fs.access(agentPath);
    } catch {
      continue;
    }

    try {
      const agentModule = ext.includes('.ts')
        ? await loadTypeScriptModule(agentPath)
        : await import(agentPath);
      return agentModule.default || agentModule;
    } catch (error) {
      lastLoadError = error;
    }
  }

  if (lastLoadError) {
    throw lastLoadError;
  }

  return loadBuiltInAgent(agentName);
}

/**
 * List all available agents in the agents/ directory
 */
export async function listAgents(): Promise<string[]> {
  const agentsDir = path.join(process.cwd(), 'agents');

  try {
    const files = await fs.readdir(agentsDir);

    // Filter for agent files and extract names
    const agentNames = files
      .filter(file => {
        return (
          file.endsWith('.agent.ts') ||
          file.endsWith('.agent.js') ||
          (file.endsWith('.ts') && !file.endsWith('.test.ts')) ||
          (file.endsWith('.js') && !file.endsWith('.test.js'))
        );
      })
      .map(file => {
        // Remove extension(s)
        return file.replace(/\.(agent\.)?(ts|js)$/, '');
      });

    return [...new Set(agentNames)]; // Remove duplicates
  } catch (error) {
    return [];
  }
}

/**
 * Check if we're in an agent project directory
 */
export async function isAgentProject(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    // Check if @agent-platform/core is in dependencies
    return !!(
      packageJson.dependencies?.['@agent-platform/core'] ||
      packageJson.devDependencies?.['@agent-platform/core']
    );
  } catch {
    return false;
  }
}

async function loadTypeScriptModule(modulePath: string): Promise<any> {
  if (!tsNodeRegistered) {
    const tsNode = requireFromHere('ts-node');
    tsNode.register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
      },
    });
    tsNodeRegistered = true;
  }

  return requireFromHere(modulePath);
}

async function loadBuiltInAgent(agentName: string): Promise<AgentDefinition | null> {
  const devPath = path.resolve(__dirname, '../../../templates/src/agents', `${agentName}.ts`);
  const prodPath = path.resolve(
    __dirname,
    '../../node_modules/@agent-platform/templates/dist/agents',
    `${agentName}.js`
  );

  for (const modulePath of [devPath, prodPath]) {
    try {
      await fs.access(modulePath);
    } catch {
      continue;
    }

    const module = modulePath.endsWith('.ts')
      ? await loadTypeScriptModule(modulePath)
      : await import(modulePath);

    return module.default || module;
  }

  return null;
}
