# axiom

axiom is a local-first library of importable AI agents with a description-first custom agent builder and a local dashboard for run history.

The current product shape in this repo is:
- `@axiom/agents`: 20 built-in agents, custom agent builder, saved custom agents, persisted run records
- `@axiom/cli`: list, try, create, init, saved-agent listing, dashboard launch
- `@axiom/dashboard`: local web dashboard for agent catalog and run observability

## Positioning

axiom is for developers and small teams embedding agent capabilities into products and workflows. It is not trying to replace Claude chat. The value is:
- ready-made agents you can import and run
- reusable custom agents from one plain-English description
- local project persistence under `.axiom/`
- visibility into runs, tools, tokens, loops, duration, cost, and auth mode

## Auth

Primary path for this wave:

```bash
claude setup-token
```

Then set:

```bash
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
```

Fallback:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

axiom prefers `CLAUDE_CODE_OAUTH_TOKEN` and falls back to API-key auth when needed.

## Local Setup

This repo is publish-ready, but the packages are not yet published to npm. Use them locally from the workspace:

```bash
pnpm install
pnpm build
```

Then run the CLI from the repo:

```bash
node packages/cli/bin/run.js list
node packages/cli/bin/run.js create
node packages/cli/bin/run.js dashboard
```

## Quick Start In Code

```ts
import "dotenv/config";
import {
  configure,
  ResearchAgent,
  PRDWriter,
  createAgent,
  loadAgent,
} from "@axiom/agents";

configure({
  oauthToken: process.env.CLAUDE_CODE_OAUTH_TOKEN,
});

const research = await ResearchAgent.run(
  "Compare the leading AI agent frameworks for product teams."
);

const prd = await PRDWriter.run(
  "Write a PRD for a dashboard that shows agent run history and saved agents."
);

const custom =
  (await loadAgent("launch-notes-summarizer")) ??
  (await createAgent(
    "An agent that summarizes product launch notes into grouped bullet points."
  ));

const result = await custom.run("Paste the launch notes here");
console.log(result.output);
```

## Built-in Agents

### Research, Product, and Strategy
- `ResearchAgent`
- `CompetitorAnalyzer`
- `PRDWriter`
- `MarketSizingAgent`
- `CustomerFeedbackSynthesizer`

### Engineering and Delivery
- `CodeReviewAgent`
- `BugTriager`
- `TechnicalSpecAgent`
- `DocumentationAgent`
- `ReleaseNotesAgent`
- `TestPlanAgent`

### Business, Marketing, and Support
- `ContentWriter`
- `EmailDrafter`
- `SEOAuditor`
- `SalesProspector`
- `ProposalWriter`
- `CustomerSupportAgent`

### Data, Finance, and Operations
- `DataAnalyst`
- `FinancialAnalyst`
- `MeetingSummarizer`

## Custom Agent Builder

The builder is description-first.

```ts
import { createAgent, saveAgent } from "@axiom/agents";

const agent = await createAgent(
  "An agent that reads customer interview notes and extracts themes, objections, and feature requests."
);

await saveAgent(agent);
const result = await agent.run("Interview notes go here");
```

Generated custom agents include:
- name
- summary
- category
- tags
- inferred tool access
- output shape
- reusable system instructions

Saved custom agents live in:

```text
.axiom/agents/<slug>.json
```

## Local Persistence

axiom stores project-local artifacts under:

```text
.axiom/
  agents/
  runs/
```

Each persisted run includes:
- agent metadata
- input and output
- success or error
- tool calls
- tokens
- cost
- duration
- loops
- auth mode

## Dashboard

Launch the local dashboard from the project root:

```bash
node packages/cli/bin/run.js dashboard
```

Dashboard v1 includes:
- built-in agent catalog
- saved custom agent catalog
- run history
- run detail view
- filters for category, kind, status, and date range
- quick run actions for built-in and custom agents

## CLI

```bash
axiom list
axiom agents
axiom try research-agent "Compare Cursor and Windsurf for a CTO eval."
axiom create
axiom dashboard
axiom init my-axiom-project
```

From this repo before publish, use:

```bash
node packages/cli/bin/run.js <command>
```

## Public API

Core exports:
- `createAgent(...)`
- `saveAgent(...)`
- `loadAgent(...)`
- `listSavedAgents(...)`
- `getBuiltInAgents()`
- `getBuiltInAgentById(...)`

Runtime exports:
- all 20 built-in agents
- `Agent`
- `configure(...)`

Storage helpers:
- `ensureProjectStorage(...)`
- `listRunRecords(...)`
- `loadRunRecord(...)`

## Market Context

axiom is closest to the space around:
- agent frameworks such as Mastra, Vercel AI SDK agents, OpenAI Agents, and deepagents
- tool infrastructure such as Composio

The difference is that axiom ships ready-to-use importable agents and a custom builder on top, rather than only giving you primitives.

## Next Layer

The next commercial layer is still the axiom proxy:
- one axiom key
- hosted traces and billing
- caching and cost controls
- team-level observability

That layer is not implemented in this repo yet. The current product is local-first and Claude-token powered.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
