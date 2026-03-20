/**
 * End-to-end test — runs real agents with real Claude Agent SDK calls.
 * Uses CLAUDE_CODE_OAUTH_TOKEN from .env
 */
import * as dotenv from "dotenv";
dotenv.config();

import { query } from "@anthropic-ai/claude-agent-sdk";

// ─── Colors for output ───────────────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function log(msg: string) { console.log(msg); }
function pass(name: string, detail: string) { log(`  ${GREEN}✓${RESET} ${name} ${DIM}${detail}${RESET}`); }
function fail(name: string, err: string) { log(`  ${RED}✗${RESET} ${name} — ${err}`); }
function header(msg: string) { log(`\n${BOLD}${CYAN}${msg}${RESET}`); }

let passed = 0;
let failed = 0;

// ─── Test 1: Raw SDK query (sanity check) ─────────────────
async function testRawSDK() {
  header("Test 1: Raw Claude Agent SDK query()");

  try {
    const sdkQuery = query({
      prompt: "What is 2 + 2? Reply with just the number.",
      options: {
        model: "claude-sonnet-4-6",
        maxTurns: 1,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        allowedTools: [],
      },
    });

    let result = "";
    let cost = 0;

    for await (const message of sdkQuery) {
      if (message.type === "result" && message.subtype === "success") {
        result = message.result;
        cost = message.total_cost_usd;
      }
    }

    if (result.includes("4")) {
      pass("Raw SDK query", `Got "${result.trim().slice(0, 50)}" | Cost: $${cost.toFixed(4)}`);
      passed++;
    } else {
      fail("Raw SDK query", `Expected "4", got "${result.slice(0, 100)}"`);
      failed++;
    }
  } catch (err: any) {
    fail("Raw SDK query", err.message);
    failed++;
  }
}

// ─── Test 2: SDK with WebSearch tool ──────────────────────
async function testWebSearch() {
  header("Test 2: SDK with WebSearch tool");

  try {
    const sdkQuery = query({
      prompt: "Search the web for 'Anthropic Claude' and tell me in one sentence what it is. Use the WebSearch tool.",
      options: {
        model: "claude-sonnet-4-6",
        maxTurns: 5,
        maxBudgetUsd: 0.50,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        allowedTools: ["WebSearch"],
      },
    });

    let result = "";
    let cost = 0;
    let turns = 0;
    const toolsUsed: string[] = [];

    for await (const message of sdkQuery) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if ("name" in block) {
            toolsUsed.push(block.name);
          }
        }
      }
      if (message.type === "result" && message.subtype === "success") {
        result = message.result;
        cost = message.total_cost_usd;
        turns = message.num_turns;
      }
    }

    if (result.length > 10) {
      pass("WebSearch tool call", `${turns} turns | Tools: [${toolsUsed.join(", ")}] | Cost: $${cost.toFixed(4)}`);
      log(`    ${DIM}Result: "${result.slice(0, 120)}..."${RESET}`);
      passed++;
    } else {
      fail("WebSearch tool call", `Result too short: "${result}"`);
      failed++;
    }
  } catch (err: any) {
    fail("WebSearch tool call", err.message);
    failed++;
  }
}

// ─── Test 3: Agent class (EmailDrafter — no tools) ───────
async function testEmailDrafter() {
  header("Test 3: axiom EmailDrafter (no tools, pure text)");

  try {
    // Import dynamically to ensure .env is loaded first
    const { EmailDrafter } = await import("./packages/agents/src/agents/email-drafter");

    const result = await EmailDrafter.run(
      "Write a short follow-up email to a client named Sarah about a project proposal we discussed last week. Keep it under 100 words."
    );

    if (result.success && result.output.length > 20) {
      pass("EmailDrafter agent", `${result.loops} turns | Cost: $${result.cost.toFixed(4)} | ${result.tokensUsed.total} tokens`);
      log(`    ${DIM}Output preview: "${result.output.slice(0, 150)}..."${RESET}`);
      passed++;
    } else {
      fail("EmailDrafter agent", result.error || `Output too short: ${result.output.length} chars`);
      failed++;
    }
  } catch (err: any) {
    fail("EmailDrafter agent", err.message);
    failed++;
  }
}

// ─── Test 4: Agent class with tool use (ResearchAgent) ───
async function testResearchAgent() {
  header("Test 4: axiom ResearchAgent (WebSearch + WebFetch tools)");

  try {
    const { ResearchAgent } = await import("./packages/agents/src/agents/research");

    const result = await ResearchAgent.run(
      "What is Claude Agent SDK? Give me a 2-sentence summary.",
      { maxLoops: 5 }
    );

    if (result.success && result.output.length > 20) {
      pass("ResearchAgent", `${result.loops} turns | ${result.toolCalls.length} tool calls | Cost: $${result.cost.toFixed(4)}`);
      if (result.toolCalls.length > 0) {
        log(`    ${DIM}Tools used: [${result.toolCalls.map(t => t.tool).join(", ")}]${RESET}`);
      }
      log(`    ${DIM}Output preview: "${result.output.slice(0, 150)}..."${RESET}`);
      passed++;
    } else {
      fail("ResearchAgent", result.error || `Output too short: ${result.output.length} chars`);
      failed++;
    }
  } catch (err: any) {
    fail("ResearchAgent", err.message);
    failed++;
  }
}

// ─── Test 5: Agent class with file tools (CodeReviewAgent) ──
async function testCodeReviewAgent() {
  header("Test 5: axiom CodeReviewAgent (Read + Glob + Grep tools)");

  try {
    const { CodeReviewAgent } = await import("./packages/agents/src/agents/code-review");

    const result = await CodeReviewAgent.run(
      "./packages/agents/src/config.ts",
      { maxLoops: 5 }
    );

    if (result.success && result.output.length > 50) {
      pass("CodeReviewAgent", `${result.loops} turns | ${result.toolCalls.length} tool calls | Cost: $${result.cost.toFixed(4)}`);
      if (result.toolCalls.length > 0) {
        log(`    ${DIM}Tools used: [${result.toolCalls.map(t => t.tool).join(", ")}]${RESET}`);
      }
      log(`    ${DIM}Output preview: "${result.output.slice(0, 150)}..."${RESET}`);
      passed++;
    } else {
      fail("CodeReviewAgent", result.error || `Output too short: ${result.output.length} chars`);
      failed++;
    }
  } catch (err: any) {
    fail("CodeReviewAgent", err.message);
    failed++;
  }
}

// ─── Test 6: createAgent() builder ──────────────────────
async function testCreateAgent() {
  header("Test 6: createAgent() — build custom agent from spec");

  try {
    const { createAgent } = await import("./packages/agents/src/create-agent");

    // Build from spec (no LLM call needed)
    const agent = await createAgent({
      task: "Summarize text concisely",
      inputs: "Any text",
      outputs: "A 1-2 sentence summary",
      tools: [],
    });

    const result = await agent.run(
      "The quick brown fox jumps over the lazy dog. This is a classic pangram used in typing tests. It contains every letter of the English alphabet at least once."
    );

    if (result.success && result.output.length > 10) {
      pass("createAgent (spec)", `${result.loops} turns | Cost: $${result.cost.toFixed(4)}`);
      log(`    ${DIM}Output: "${result.output.slice(0, 150)}..."${RESET}`);
      passed++;
    } else {
      fail("createAgent (spec)", result.error || "No output");
      failed++;
    }
  } catch (err: any) {
    fail("createAgent (spec)", err.message);
    failed++;
  }
}

// ─── Test 7: Streaming ─────────────────────────────────
async function testStreaming() {
  header("Test 7: Agent streaming API");

  try {
    const { Agent } = await import("./packages/agents/src/agent");

    const agent = new Agent({
      instructions: "You are a helpful assistant. Be very brief.",
      allowedTools: [],
      maxLoops: 1,
    });

    const events: string[] = [];
    let gotDone = false;

    for await (const event of agent.stream("Say 'hello world' and nothing else.")) {
      events.push(event.type);
      if (event.type === "done") {
        gotDone = true;
        if (event.finalResult) {
          log(`    ${DIM}Stream result: "${event.finalResult.output.slice(0, 100)}" | Cost: $${event.finalResult.cost.toFixed(4)}${RESET}`);
        }
      }
    }

    if (gotDone && events.length >= 1) {
      pass("Streaming", `${events.length} events: [${events.join(", ")}]`);
      passed++;
    } else {
      fail("Streaming", `No done event. Events: [${events.join(", ")}]`);
      failed++;
    }
  } catch (err: any) {
    fail("Streaming", err.message);
    failed++;
  }
}

// ─── Run all tests ──────────────────────────────────────
async function main() {
  log(`\n${BOLD}════════════════════════════════════════════════════════`);
  log(`  axiom E2E Tests — Real Claude Agent SDK Calls`);
  log(`════════════════════════════════════════════════════════${RESET}`);

  const token = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (!token) {
    log(`\n${RED}ERROR: CLAUDE_CODE_OAUTH_TOKEN not set. Cannot run E2E tests.${RESET}`);
    process.exit(1);
  }
  log(`\n${DIM}Auth: OAuth token (${token.slice(0, 20)}...)${RESET}`);
  log(`${DIM}Model: claude-sonnet-4-6${RESET}`);

  const start = Date.now();

  // Run tests sequentially (each makes real API calls)
  await testRawSDK();
  await testWebSearch();
  await testEmailDrafter();
  await testResearchAgent();
  await testCodeReviewAgent();
  await testCreateAgent();
  await testStreaming();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  log(`\n${BOLD}════════════════════════════════════════════════════════`);
  log(`  Results: ${GREEN}${passed} passed${RESET}${failed > 0 ? `, ${RED}${failed} failed${RESET}` : ""} ${DIM}(${elapsed}s)${RESET}`);
  log(`${BOLD}════════════════════════════════════════════════════════${RESET}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
