import { Command, Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import * as path from 'path';
import * as inquirer from 'inquirer';
import { isAgentProject } from '../utils/config-loader';
import {
  getAvailableTemplates,
  copyTemplate,
  detectProjectFramework,
  detectProjectLanguage,
  FrameworkType,
  LanguageType,
  TemplateVariant,
  AgentTemplate
} from '../utils/template-manager';
import { pathExists } from '../utils/fs-utils';

export default class Add extends Command {
  static description = 'Add an agent template to your project';

  static examples = [
    '<%= config.bin %> <%= command.id %> research-agent',
    '<%= config.bin %> <%= command.id %> research-agent --framework=langchain --lang=python',
    '<%= config.bin %> <%= command.id %> research-agent --path=./src/agents',
  ];

  static args = {
    template: Args.string({
      description: 'Agent template name (e.g., research-agent, code-review-agent)',
      required: true,
    }),
  };

  static flags = {
    framework: Flags.string({
      description: 'Framework to use (langchain, crewai, raw)',
      options: ['langchain', 'crewai', 'raw'],
    }),
    lang: Flags.string({
      description: 'Language to use (python, typescript)',
      options: ['python', 'typescript'],
    }),
    path: Flags.string({
      description: 'Path where to add the agent files',
      default: './agents',
    }),
    'agent-name': Flags.string({
      description: 'Custom agent name (defaults to template name)',
    }),
    force: Flags.boolean({
      description: 'Overwrite existing files',
      default: false,
    }),
    'skip-install': Flags.boolean({
      description: 'Skip dependency installation prompts',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Add);

    try {
      // Check if we're in an agent project
      if (!await isAgentProject()) {
        this.log(chalk.yellow('⚠ Not in an agent project. Run "agent init" to create one.'));
        return;
      }

      const templateName = args.template;
      const agentName = flags['agent-name'] || templateName.replace('-agent', '');

      this.log(chalk.bold.cyan(`\n🔍 Adding ${templateName} template...\n`));

      // Get available templates
      const availableTemplates = await getAvailableTemplates();
      const template = availableTemplates.find(t => t.name === templateName);

      if (!template) {
        this.log(chalk.red(`❌ Template "${templateName}" not found`));
        this.log(chalk.dim('Available templates:'));
        availableTemplates.forEach(t => {
          this.log(chalk.dim(`  - ${t.name}`));
        });
        return;
      }

      // Detect or get framework and language preferences
      const { framework, language, variant } = await this.selectTemplateVariant(
        template,
        flags.framework as FrameworkType,
        flags.lang as LanguageType
      );

      if (!variant) {
        this.log(chalk.red('❌ No compatible template variant found'));
        return;
      }

      // Prepare target directory
      const targetPath = path.resolve(flags.path, agentName);

      if (await pathExists(targetPath) && !flags.force) {
        const { overwrite } = await inquirer.prompt([{
          type: 'confirm',
          name: 'overwrite',
          message: `Directory ${targetPath} already exists. Overwrite?`,
          default: false,
        }]);

        if (!overwrite) {
          this.log(chalk.yellow('Operation cancelled.'));
          return;
        }
      }

      // Copy template files
      this.log(chalk.blue('📁 Copying template files...'));

      const copiedFiles = await copyTemplate(template, variant, {
        targetPath,
        agentName,
        templateName,
        framework,
        language,
        author: await this.getAuthorName(),
        description: template.description,
      });

      this.log(chalk.green(`\n✅ Successfully added ${templateName} template!\n`));

      // Show what was created
      this.log(chalk.bold('📄 Files created:'));
      copiedFiles.forEach(file => {
        this.log(chalk.green(`  ✓ ${path.relative(process.cwd(), file)}`));
      });

      // Show dependencies to install
      if (variant.dependencies && !flags['skip-install']) {
        await this.showInstallInstructions(variant, language, targetPath);
      }

      // Show next steps
      this.showNextSteps(templateName, agentName, targetPath, language);

    } catch (error) {
      this.log(chalk.red(`❌ Failed to add template: ${error}`));
      if (process.env.DEBUG) {
        console.error(error);
      }
    }
  }

  private async selectTemplateVariant(
    template: any,
    preferredFramework?: FrameworkType,
    preferredLanguage?: LanguageType
  ): Promise<{ framework: FrameworkType; language: LanguageType; variant: TemplateVariant | null }> {

    const variants = Object.values(template.variants) as TemplateVariant[];

    // Auto-detect project preferences if not specified
    const detectedFramework = preferredFramework || await detectProjectFramework();
    const detectedLanguage = preferredLanguage || await detectProjectLanguage();

    // Find exact match first
    let variant = variants.find((v: TemplateVariant) =>
      v.framework === detectedFramework && v.language === detectedLanguage
    ) as TemplateVariant;

    if (variant) {
      this.log(chalk.blue(`🔍 Detected: ${detectedLanguage} + ${detectedFramework}`));
      return {
        framework: detectedFramework,
        language: detectedLanguage,
        variant,
      };
    }

    // Interactive selection if no exact match
    this.log(chalk.yellow('🤔 Multiple options available. Please choose:'));

    const choices = variants.map((v: TemplateVariant) => ({
      name: `${v.language} + ${v.framework} - ${v.description}`,
      value: v,
      short: `${v.language}/${v.framework}`,
    }));

    const { selectedVariant } = await inquirer.prompt([{
      type: 'list',
      name: 'selectedVariant',
      message: 'Which template variant would you like to use?',
      choices,
    }]);

    return {
      framework: selectedVariant.framework,
      language: selectedVariant.language,
      variant: selectedVariant,
    };
  }

  private async showInstallInstructions(
    variant: TemplateVariant,
    language: LanguageType,
    targetPath: string
  ): Promise<void> {
    this.log(chalk.bold.yellow('\n📦 Dependencies to install:'));

    if (language === 'python') {
      if (variant.dependencies?.packages) {
        const packages = Array.isArray(variant.dependencies.packages)
          ? variant.dependencies.packages
          : Object.keys(variant.dependencies.packages);

        packages.forEach(pkg => {
          this.log(chalk.dim(`  - ${pkg}`));
        });

        this.log(chalk.bold('\n💻 Run this command:'));
        this.log(chalk.cyan(`  cd ${path.relative(process.cwd(), targetPath)}`));
        this.log(chalk.cyan(`  pip install -r requirements.txt`));
      }
    } else if (language === 'typescript') {
      if (variant.dependencies?.packages) {
        const packages = variant.dependencies.packages as Record<string, string>;
        Object.keys(packages).forEach(pkg => {
          this.log(chalk.dim(`  - ${pkg}`));
        });

        this.log(chalk.bold('\n💻 Run this command:'));
        this.log(chalk.cyan(`  cd ${path.relative(process.cwd(), targetPath)}`));
        this.log(chalk.cyan(`  npm install`));
      }
    }

    const { installNow } = await inquirer.prompt([{
      type: 'confirm',
      name: 'installNow',
      message: 'Install dependencies now?',
      default: true,
    }]);

    if (installNow) {
      await this.installDependencies(variant, language, targetPath);
    }
  }

  private async installDependencies(
    variant: TemplateVariant,
    language: LanguageType,
    targetPath: string
  ): Promise<void> {
    const { spawn } = require('child_process');

    this.log(chalk.blue('\n📦 Installing dependencies...'));

    return new Promise((resolve, reject) => {
      let command: string;
      let args: string[];

      if (language === 'python') {
        command = 'pip';
        args = ['install', '-r', 'requirements.txt'];
      } else {
        command = 'npm';
        args = ['install'];
      }

      const child = spawn(command, args, {
        cwd: targetPath,
        stdio: 'pipe'
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          this.log(chalk.green('✅ Dependencies installed successfully!'));
          resolve(void 0);
        } else {
          this.log(chalk.yellow('⚠ Dependencies installation failed. Please install manually.'));
          resolve(void 0); // Don't fail the whole process
        }
      });

      child.on('error', () => {
        this.log(chalk.yellow('⚠ Could not install dependencies automatically. Please install manually.'));
        resolve(void 0);
      });
    });
  }

  private showNextSteps(
    templateName: string,
    agentName: string,
    targetPath: string,
    language: LanguageType
  ): void {
    const relativePath = path.relative(process.cwd(), targetPath);
    const usage = this.getUsageSnippet(templateName, agentName, language);

    this.log(chalk.bold.green('\n🚀 Next Steps:\n'));

    this.log(chalk.bold('1. Review the generated files:'));
    this.log(chalk.cyan(`   cd ${relativePath}`));
    this.log(chalk.cyan('   dir'));
    this.log(chalk.cyan('   # Read README.md for setup and customization notes'));

    this.log(chalk.bold('\n2. Run the example:'));
    if (language === 'python') {
      this.log(chalk.cyan(`   cd ${relativePath}`));
      this.log(chalk.cyan('   python example.py'));
    } else {
      this.log(chalk.cyan(`   cd ${relativePath}`));
      this.log(chalk.cyan('   npm run example'));
    }

    this.log(chalk.bold('\n3. Use in your code:'));
    this.log(chalk.cyan(`   ${usage.importLine}`));
    this.log(chalk.cyan(`   ${usage.callLine}`));

    this.log(chalk.dim(`\n📖 See ${relativePath}/README.md for detailed documentation`));
  }

  private getUsageSnippet(
    templateName: string,
    agentName: string,
    language: LanguageType
  ): { importLine: string; callLine: string } {
    const pythonSnippets: Record<string, { importLine: string; callLine: string }> = {
      'research-agent': {
        importLine: `from ${agentName} import research`,
        callLine: "result = research('your question')",
      },
      'code-review-agent': {
        importLine: `from ${agentName} import CodeReviewAgent`,
        callLine: `reviewer = CodeReviewAgent(); result = reviewer.review('path/to/file.py')`,
      },
      'data-analysis-agent': {
        importLine: `from ${agentName} import analyze`,
        callLine: "report = analyze('path/to/data.csv')",
      },
      'task-planner-agent': {
        importLine: `from ${agentName} import plan_task`,
        callLine: "plan = plan_task('Goal: ship feature X')",
      },
      'documentation-agent': {
        importLine: `from ${agentName} import document`,
        callLine: "summary = document('src')",
      },
    };

    const typescriptSnippets: Record<string, { importLine: string; callLine: string }> = {
      'research-agent': {
        importLine: `import { research } from './${agentName}';`,
        callLine: "const result = await research('your question');",
      },
      'code-review-agent': {
        importLine: `import { ${this.toPascalCase(agentName)} } from './${agentName}';`,
        callLine: `const reviewer = new ${this.toPascalCase(agentName)}(...);`,
      },
      'data-analysis-agent': {
        importLine: `import { analyze } from './${agentName}';`,
        callLine: "const report = await analyze('path/to/data.csv');",
      },
      'task-planner-agent': {
        importLine: `import { planTask } from './${agentName}';`,
        callLine: "const plan = planTask('Goal: ship feature X');",
      },
      'documentation-agent': {
        importLine: `import { document } from './${agentName}';`,
        callLine: "const summary = await document('src');",
      },
    };

    if (language === 'python') {
      return pythonSnippets[templateName] ?? {
        importLine: `from ${agentName} import main`,
        callLine: "result = main('your input')",
      };
    }

    return typescriptSnippets[templateName] ?? {
      importLine: `import './${agentName}';`,
      callLine: '// Adapt the generated module to your use case',
    };
  }

  private toPascalCase(value: string): string {
    return value
      .replace(/[-_](\w)/g, (_, char: string) => char.toUpperCase())
      .replace(/^\w/, char => char.toUpperCase());
  }

  private async getAuthorName(): Promise<string> {
    return (
      process.env.GIT_AUTHOR_NAME ||
      process.env.USERNAME ||
      process.env.USER ||
      'Agent Developer'
    );
  }
}
