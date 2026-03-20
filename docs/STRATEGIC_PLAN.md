# axiom Strategic Plan

## Core Thesis

axiom should be the easiest way for product teams to ship agent capabilities:
- import a built-in agent
- generate a custom agent from one description
- persist the result in-project
- inspect runs locally

The target buyer is a developer or small team shipping product features, not a consumer choosing between axiom and Claude chat.

## Why This Direction

The strongest part of axiom is not a custom runtime. It is:
- curated built-in agents
- reusable custom agents
- good defaults around tools and prompts
- visibility into what ran and what it cost

This creates a different category from:
- frameworks such as Mastra, Vercel AI SDK, OpenAI Agents, and deepagents
- tool infrastructure such as Composio

Those tools help developers build agents. axiom ships working agents plus a builder on top.

## v0.1 Product Surface

### Library
- 20 built-in agents
- custom builder from plain English
- save/load/list for custom agent definitions
- run persistence under `.axiom/runs`

### CLI
- list built-in agents
- list saved custom agents
- run built-in agents
- create and save custom agents
- initialize a local project
- launch the local dashboard

### Dashboard
- local full-stack app
- built-in and custom catalog
- run history and run detail
- status, category, kind, and date filtering
- run actions from the UI

## Auth and Runtime

For this wave, the primary runtime path is the Claude token workflow:

```bash
claude setup-token
CLAUDE_CODE_OAUTH_TOKEN=...
```

This keeps setup lightweight and matches the current product direction. API key auth remains as fallback. Proxy monetization is the next layer, not the current requirement.

## Business Model Sequence

### Now
- local-first product
- publish-ready packages
- adoption through simplicity and breadth

### Next
- axiom proxy
- hosted observability
- credits/usage billing
- shared team agents
- caching and cost optimization

The important strategic split is:
- **current runtime**: Claude-token powered local-first product
- **future monetization**: hosted proxy and team platform

## What Makes axiom Defensible

Potential moat comes from:
- curated prompts and agent packaging
- prebuilt coverage across common workflows
- reusable custom agent definitions
- local and future hosted observability
- eventual switching cost once teams depend on saved agents, traces, and shared workflows

## Next Strategic Upgrades

After v0.1, the highest-leverage upgrades are:
- typed outputs for high-value agents
- simple multi-agent composition
- hosted traces and billing
- caching for repeated research workflows
- team sharing and versioned custom agents
