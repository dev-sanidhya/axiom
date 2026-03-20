import 'dotenv/config';
import {
  EmailDrafter,
  ResearchAgent,
  CodeReviewAgent,
  BugTriager,
  ContentWriter,
  DataAnalyst,
  SEOAuditor,
  CompetitorAnalyzer,
  createAgent,
  configure,
} from './packages/agents/src/index';

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  process.stdout.write(`\n[${'TEST'}] ${name}... `);
  try {
    await fn();
    const dur = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`PASS (${dur}s)`);
  } catch (err) {
    const dur = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`FAIL (${dur}s)`);
    console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  console.log('=== axiom E2E Tests ===');
  console.log(`OAuth token: ${process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'SET' : 'MISSING'}`);
  console.log(`API key: ${process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING'}`);

  // Test 1: EmailDrafter (no tools - pure LLM, simplest test)
  await test('EmailDrafter - pure LLM, no tools', async () => {
    const result = await EmailDrafter.run(
      'Write a short follow-up email to a potential investor after a 30-min demo call. Casual tone.'
    );
    console.log();
    console.log(`  Success: ${result.success}`);
    console.log(`  Loops: ${result.loops}`);
    console.log(`  Tokens: ${result.tokensUsed.total}`);
    console.log(`  Cost: $${result.cost.toFixed(4)}`);
    console.log(`  Output preview: ${result.output.slice(0, 200)}...`);
    if (!result.success) throw new Error(result.error || 'Failed');
    if (!result.output) throw new Error('Empty output');
  });

  // Test 2: CodeReviewAgent (file tools - read_file, list_files)
  await test('CodeReviewAgent - file tools', async () => {
    const result = await CodeReviewAgent.run('./packages/agents/src/config.ts');
    console.log();
    console.log(`  Success: ${result.success}`);
    console.log(`  Tool calls: ${result.toolCalls.map(t => t.tool).join(', ')}`);
    console.log(`  Loops: ${result.loops}`);
    console.log(`  Tokens: ${result.tokensUsed.total}`);
    console.log(`  Cost: $${result.cost.toFixed(4)}`);
    console.log(`  Output preview: ${result.output.slice(0, 200)}...`);
    if (!result.success) throw new Error(result.error || 'Failed');
    if (result.toolCalls.length === 0) throw new Error('No tool calls made');
  });

  // Test 3: BugTriager (file tools)
  await test('BugTriager - bug report triage', async () => {
    const result = await BugTriager.run(
      'Bug: The web_search tool returns "No results found" even when BRAVE_SEARCH_API_KEY is set. ' +
      'Steps to reproduce: Set BRAVE_SEARCH_API_KEY=valid_key, call webSearchTool.execute({query: "test"}). ' +
      'Expected: search results. Actual: "No results found". ' +
      'Relevant file: packages/agents/src/tools/web-search.ts'
    );
    console.log();
    console.log(`  Success: ${result.success}`);
    console.log(`  Tool calls: ${result.toolCalls.map(t => t.tool).join(', ')}`);
    console.log(`  Loops: ${result.loops}`);
    console.log(`  Cost: $${result.cost.toFixed(4)}`);
    console.log(`  Output preview: ${result.output.slice(0, 200)}...`);
    if (!result.success) throw new Error(result.error || 'Failed');
  });

  // Test 4: ContentWriter (web search tool)
  await test('ContentWriter - with web search', async () => {
    const result = await ContentWriter.run(
      'Write a 3-paragraph summary about what Claude Agent SDK is and why developers use it. Keep it under 300 words.'
    );
    console.log();
    console.log(`  Success: ${result.success}`);
    console.log(`  Tool calls: ${result.toolCalls.map(t => t.tool).join(', ') || 'none'}`);
    console.log(`  Loops: ${result.loops}`);
    console.log(`  Cost: $${result.cost.toFixed(4)}`);
    console.log(`  Output preview: ${result.output.slice(0, 200)}...`);
    if (!result.success) throw new Error(result.error || 'Failed');
  });

  // Test 5: createAgent - custom agent builder
  await test('createAgent - build from description', async () => {
    const agent = await createAgent(
      'An agent that takes a product name and generates 3 tagline ideas'
    );
    console.log();
    console.log(`  Agent created: ${agent.description}`);
    const result = await agent.run('axiom');
    console.log(`  Success: ${result.success}`);
    console.log(`  Output preview: ${result.output.slice(0, 200)}...`);
    if (!result.success) throw new Error(result.error || 'Failed');
  });

  // Test 6: createAgent - build from spec
  await test('createAgent - build from spec', async () => {
    const agent = await createAgent({
      task: 'Summarize text into bullet points',
      inputs: 'A block of text',
      outputs: 'Markdown bullet-point summary',
      tools: [],
    });
    const result = await agent.run(
      'axiom is a library of pre-built AI agents that anyone can import and use. ' +
      'It wraps the Anthropic Claude SDK and provides 8 agents out of the box. ' +
      'Users authenticate via OAuth tokens from their Claude Max plan.'
    );
    console.log();
    console.log(`  Success: ${result.success}`);
    console.log(`  Output: ${result.output}`);
    if (!result.success) throw new Error(result.error || 'Failed');
  });

  console.log('\n=== E2E Tests Complete ===');
}

main().catch(console.error);
