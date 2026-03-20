import * as path from 'path';
import {
  copyPath,
  ensureDir,
  pathExists,
  pathExistsSync,
  readFile,
  readJson,
  readdir,
  stat,
  writeFile,
} from './fs-utils';

export type FrameworkType = 'langchain' | 'crewai' | 'raw';
export type LanguageType = 'python' | 'typescript' | 'javascript';

export interface TemplateVariant {
  path: string;
  language: LanguageType;
  framework: FrameworkType;
  description: string;
  dependencies?: {
    python?: string;
    node?: string;
    packages?: string[] | Record<string, string>;
  };
  files?: Record<string, string>;
}

export interface AgentTemplate {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  tags: string[];
  capabilities: {
    tools: string[];
    useCases: string[];
  };
  variants: Record<string, TemplateVariant>;
  examples: Array<{
    title: string;
    description: string;
    input: string;
    expectedOutput: string;
  }>;
}

interface RawTemplateManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  tags?: string[];
  capabilities?: {
    tools?: string[];
    useCases?: string[];
  };
  variants?: Record<string, RawTemplateVariant>;
  templates?: {
    variants?: Record<string, RawTemplateVariant>;
  };
  examples?: Array<{
    title: string;
    description: string;
    input: string;
    expectedOutput: string;
  }>;
}

interface RawTemplateVariant extends Omit<TemplateVariant, 'framework'> {
  framework: FrameworkType | 'none';
}

export interface TemplateContext {
  targetPath: string;
  agentName: string;
  templateName: string;
  framework: FrameworkType;
  language: LanguageType;
  author: string;
  description: string;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Get all available agent templates from the templates package
 */
export async function getAvailableTemplates(): Promise<AgentTemplate[]> {
  const templatesDir = getTemplatesDirectory();

  if (!await pathExists(templatesDir)) {
    throw new Error(`Templates directory not found: ${templatesDir}`);
  }

  const templates: AgentTemplate[] = [];
  const templateDirs = await readdir(templatesDir);

  for (const dir of templateDirs) {
    const manifestPath = path.join(templatesDir, dir, 'manifest.json');

    if (await pathExists(manifestPath)) {
      try {
        const manifest = await readJson<RawTemplateManifest>(manifestPath);
        templates.push(normalizeTemplateManifest(manifest));
      } catch (error) {
        console.warn(`Failed to load manifest for ${dir}:`, error);
      }
    }
  }

  return templates;
}

/**
 * Copy a template with variable substitution
 */
export async function copyTemplate(
  template: AgentTemplate,
  variant: TemplateVariant,
  context: TemplateContext
): Promise<string[]> {
  const templatesDir = getTemplatesDirectory();
  const sourcePath = path.join(templatesDir, template.name, variant.path);

  if (!await pathExists(sourcePath)) {
    throw new Error(`Template source path not found: ${sourcePath}`);
  }

  // Ensure target directory exists
  await ensureDir(context.targetPath);

  // Prepare template variables
  const variables = createTemplateVariables(context);

  // Copy files with variable substitution
  const copiedFiles: string[] = [];
  await copyDirectoryWithSubstitution(sourcePath, context.targetPath, variables, copiedFiles);

  return copiedFiles;
}

/**
 * Detect the project's framework preference
 */
export async function detectProjectFramework(): Promise<FrameworkType> {
  const cwd = process.cwd();

  // Check Python files
  const requirementsPath = path.join(cwd, 'requirements.txt');
  const pyprojectPath = path.join(cwd, 'pyproject.toml');

  if (await pathExists(requirementsPath)) {
    const content = await readFile(requirementsPath, 'utf-8');
    if (content.includes('crewai')) return 'crewai';
    if (content.includes('langchain')) return 'langchain';
  }

  if (await pathExists(pyprojectPath)) {
    const content = await readFile(pyprojectPath, 'utf-8');
    if (content.includes('crewai')) return 'crewai';
    if (content.includes('langchain')) return 'langchain';
  }

  // Check Node.js files
  const packageJsonPath = path.join(cwd, 'package.json');
  if (await pathExists(packageJsonPath)) {
    try {
      const packageJson = await readJson<PackageJson>(packageJsonPath);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps.langchain) return 'langchain';
    } catch {
      // Ignore parsing errors
    }
  }

  // Default to raw if no framework detected
  return 'raw';
}

/**
 * Detect the project's language preference
 */
export async function detectProjectLanguage(): Promise<LanguageType> {
  const cwd = process.cwd();

  // Check for Python indicators
  const pythonFiles = [
    'requirements.txt',
    'pyproject.toml',
    'setup.py',
    'Pipfile',
    '.python-version'
  ];

  for (const file of pythonFiles) {
    if (await pathExists(path.join(cwd, file))) {
      return 'python';
    }
  }

  // Check for TypeScript/Node.js indicators
  const nodeFiles = [
    'package.json',
    'tsconfig.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml'
  ];

  for (const file of nodeFiles) {
    if (await pathExists(path.join(cwd, file))) {
      // Check if it's TypeScript specifically
      if (file === 'tsconfig.json') return 'typescript';

      // Check package.json for TypeScript dependencies
      if (file === 'package.json') {
        try {
          const packageJson = await readJson<PackageJson>(path.join(cwd, file));
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

          if (deps.typescript || deps['@types/node']) return 'typescript';
        } catch {
          // Ignore parsing errors
        }
      }

      return 'javascript'; // Default to JavaScript for Node.js projects
    }
  }

  // Default to Python if no clear indicators
  return 'python';
}

/**
 * Get the templates directory path
 */
function getTemplatesDirectory(): string {
  // In development, templates are in the monorepo
  const devPath = path.resolve(__dirname, '../../../templates/src');

  // In production, templates would be in node_modules
  const prodPath = path.resolve(__dirname, '../../node_modules/@agent-platform/templates/dist');

  // Try development path first
  if (pathExistsSync(devPath)) {
    return devPath;
  }

  return prodPath;
}

/**
 * Create template variables for substitution
 */
export function createTemplateVariables(context: TemplateContext): Record<string, string> {
  const { agentName } = context;

  return {
    // Agent name variations
    agent_name: toSnakeCase(agentName),
    agentName: toCamelCase(agentName),
    AgentName: toPascalCase(agentName),
    'agent-name': toKebabCase(agentName),
    package_name: toKebabCase(agentName),

    // Other context
    template_name: context.templateName,
    framework: context.framework,
    language: context.language,
    author: context.author,
    author_name: context.author,
    description: context.description,

    // Current date
    date: new Date().toISOString().split('T')[0],
    year: new Date().getFullYear().toString(),
  };
}

/**
 * Copy directory with variable substitution
 */
async function copyDirectoryWithSubstitution(
  sourcePath: string,
  targetPath: string,
  variables: Record<string, string>,
  copiedFiles: string[]
): Promise<void> {
  const items = await readdir(sourcePath);

  for (const item of items) {
    const sourceFile = path.join(sourcePath, item);
    const fileStat = await stat(sourceFile);

    if (fileStat.isDirectory()) {
      // Recursively copy directories
      const targetDir = path.join(targetPath, substituteVariables(item, variables));
      await ensureDir(targetDir);
      await copyDirectoryWithSubstitution(sourceFile, targetDir, variables, copiedFiles);
    } else {
      // Copy and process files
      const fileName = substituteVariables(item, variables);
      const targetFile = path.join(targetPath, fileName);

      if (isBinaryFile(sourceFile)) {
        // Copy binary files as-is
        await copyPath(sourceFile, targetFile);
      } else {
        // Process text files with variable substitution
        const content = await readFile(sourceFile, 'utf-8');
        const processedContent = substituteVariables(content, variables);
        await writeFile(targetFile, processedContent);
      }

      copiedFiles.push(targetFile);
    }
  }
}

/**
 * Substitute template variables in text
 */
function substituteVariables(text: string, variables: Record<string, string>): string {
  let processed = text;
  for (const [key, value] of Object.entries(variables)) {
    processed = processed.replace(new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g'), value);
  }
  return processed;
}

/**
 * Check if a file is binary (simple heuristic)
 */
function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.exe', '.bin',
    '.woff', '.woff2', '.ttf', '.eot'
  ];

  const ext = path.extname(filePath).toLowerCase();
  return binaryExtensions.includes(ext);
}

/**
 * String case conversion utilities
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/^_/, '');
}

function toCamelCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toUpperCase());
}

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/^-/, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTemplateManifest(manifest: RawTemplateManifest): AgentTemplate {
  const rawVariants = manifest.variants ?? manifest.templates?.variants ?? {};
  const variants = Object.fromEntries(
    Object.entries(rawVariants).map(([key, variant]) => [
      key,
      {
        ...variant,
        framework: variant.framework === 'none' ? 'raw' : variant.framework,
      },
    ])
  ) as Record<string, TemplateVariant>;

  return {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author ?? 'Agent Platform',
    license: manifest.license ?? 'MIT',
    tags: manifest.tags ?? [],
    capabilities: {
      tools: manifest.capabilities?.tools ?? [],
      useCases: manifest.capabilities?.useCases ?? [],
    },
    variants,
    examples: manifest.examples ?? [],
  };
}
