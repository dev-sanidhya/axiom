# axiom v0.1 Plan

## Product Definition

axiom is a local-first product for developers and teams who want working AI agents in code without building an agent stack from scratch.

Current v0.1 shape:
- 20 importable built-in agents
- custom agents generated from one plain-English description
- project-local persistence under `.axiom/`
- CLI for creation, execution, and setup
- local dashboard for catalog + observability

## What Is Implemented

### Runtime
- Claude token-first auth via `CLAUDE_CODE_OAUTH_TOKEN`
- `ANTHROPIC_API_KEY` fallback
- run persistence with `authMode`
- project-level config for storage and run persistence

### Agent Library
- built-in catalog across research, engineering, product, business, finance, support, and ops
- reusable custom agent definitions
- save/load/list helpers for custom agents
- run records for both built-in and custom agents

### CLI
- `list`
- `agents`
- `try`
- `create`
- `dashboard`
- `init`

### Dashboard
- local server-backed dashboard package
- built-in + custom agent catalog
- run history
- run detail inspection
- filters by kind, category, status, and date range
- run actions from the UI

## Product Thesis

axiom is not an agent framework and not a Claude replacement.

It is:
- a library of ready-made agents
- a description-first builder for reusable custom agents
- a local-first developer surface with persistence and visibility

This is the wedge before a hosted proxy and billing layer.

## Commercial Direction

Near-term:
- Claude token-powered local-first product
- publish-ready packages
- broaden adoption through ready-made agents and builder UX

Next layer:
- axiom proxy
- hosted traces and dashboards
- usage billing and caching
- team management

## Phase 1 - Employee Model (MCP Tool Access)

### Status: Implemented

Agents are now "employees" - each has a curated set of domain-specific tools via Composio MCP, not just generic Claude Code tools.

### What was built
- `src/mcp.ts` - Composio MCP helper that creates a Tool Router session and returns the MCP server config for the Claude Agent SDK
- `mcpToolkits?: string[]` added to `AgentConfig`, `BuiltInAgentDefinition`, and `GlobalConfig` (composioApiKey)
- `Agent.buildQueryOptions()` now calls Composio to get a live MCP URL and injects it into `mcpServers` + `allowedTools` before each run
- Graceful degradation: if `COMPOSIO_API_KEY` is not set or Composio is unreachable, agents run normally without MCP tools

### Toolkit assignments
| Agent | Composio Toolkits |
|---|---|
| ResearchAgent | HACKERNEWS, GITHUB |
| CompetitorAnalyzer | HACKERNEWS, GITHUB |
| CodeReviewAgent | GITHUB |
| BugTriager | GITHUB |
| ReleaseNotesAgent | GITHUB |
| SEOAuditor | HACKERNEWS |

### Usage
Set `COMPOSIO_API_KEY` in your environment, or:
```ts
configure({ composioApiKey: "your-key" });
```
Agents with `mcpToolkits` automatically get Composio tools on each run. No extra code needed.

### Iteration 2 additions (on top of Phase 1)
- **Haiku router** - before creating a Composio session, a Haiku call classifies the input and returns only the toolkits that are actually needed for this specific run. Pure text tasks return `[]` and skip Composio entirely.
- **Session cache** - sessions are cached in-memory by sorted toolkit combination for 25 minutes. Same toolkit combo on repeat runs pays zero extra network calls.
- **Custom agent toolkits** - `createAgent()` builder prompt now includes `mcpToolkits` in the JSON spec. Claude Sonnet infers which Composio toolkits the agent genuinely needs. `AgentSpec` also accepts `mcpToolkits` for structured creation. Both flow through `SavedAgentDefinition` and into the `Agent` constructor.

### Next phases
- Phase 2: Add more toolkit coverage (YOUTUBE, REDDIT, financial tools)
- Phase 3: Per-agent routing rules (domain-specific heuristics beyond Haiku)
- Phase 4: Dashboard shows which toolkits were used per run

## Current Gaps After v0.1

Still not implemented:
- hosted SaaS dashboard
- axiom proxy and billing
- team auth / multi-user backend
- marketplace and sharing layer
- semantic caching
- typed structured outputs for individual agents

## Success Criteria

The repo should let a user:
1. build the workspace
2. run a built-in agent
3. create and save a custom agent
4. inspect runs in the local dashboard
5. pack the packages for publish without test artifacts leaking into tarballs
