# axiom Strategic Plan

## Executive Summary

axiom is now a real local-first agent product, not just a framing exercise.

The repo currently delivers:
- a publish-ready monorepo with agents, CLI, and dashboard packages
- 20 built-in importable agents across research, engineering, product, business, marketing, finance, support, and operations
- a description-first custom agent builder that generates reusable agent definitions from plain English
- project-local persistence under `.axiom/agents` and `.axiom/runs`
- a local dashboard for catalog browsing, run execution, and run inspection

The strategy should now reflect that v0.1 is implemented as a usable local product. The next phase is not "prove the concept exists." The next phase is to harden distribution, sharpen positioning, and decide how the hosted proxy and team layer get added without weakening the local-first wedge.

The strongest part of axiom is not a custom runtime. It is:
- curated built-in agents
- reusable custom agents
- good defaults around tools and prompts
- visibility into what ran and what it cost

Those tools help developers build agents. axiom ships working agents plus a builder on top.

## Current Repo State

### Product Shape In This Repository

The monorepo is organized into three packages:
- agents: runtime wrapper over the Claude Agent SDK, built-in agents, custom agent builder, storage helpers, and run persistence
- CLI: end-user commands for listing agents, running built-in agents, creating custom agents, initializing projects, listing saved agents, and launching the dashboard
- dashboard: local HTTP UI with catalog browsing, filters, run history, run detail, and run actions

This is a materially different state from the older strategic narrative. The repo is no longer centered on templates or a proprietary runtime. It is already aligned with the agent-library thesis.

### What Is Implemented

#### Runtime and Auth
- Claude token-first auth via `CLAUDE_CODE_OAUTH_TOKEN`
- fallback auth via `ANTHROPIC_API_KEY`
- future-facing support for `AXIOM_API_KEY` and custom `baseUrl`
- configurable defaults for model, loop limits, spend limit, storage directory, and persistence
- streaming support and progress hooks in the agent runtime
- persisted run records include auth mode, tokens, cost, duration, loops, tool calls, input/output previews, project name, and working directory

#### Agent Library
- 20 built-in agents exposed as importable runtime objects
- categories spanning research, engineering, product, business, marketing, finance, support, operations, and general use
- custom agent generation from one plain-English prompt using a builder prompt on top of Claude
- structured-spec support for custom agent creation in addition to free-text generation
- save/load/list flows for reusable custom agents under `.axiom/agents`

#### CLI Surface
- `axiom list`
- `axiom agents`
- `axiom try [agent] [input]`
- `axiom create`
- `axiom dashboard`
- `axiom init [name]`

The CLI now supports the actual product loop: discover, run, create, save, inspect, and bootstrap.

#### Dashboard Surface
- local server-backed dashboard launched from the CLI
- built-in and saved custom agent catalog
- filters for kind and category in the catalog
- run history with status and date filters
- run detail inspection for output, tool calls, loops, cost, tokens, and auth mode
- run actions directly from the browser UI

#### Packaging and Workspace Readiness
- all three packages are versioned at `0.1.0`
- package manifests are configured for public publish
- package `files` fields constrain publish artifacts to built outputs and docs
- workspace build/test scripts are wired through Turbo
- the agents package has real Jest coverage for core runtime, builder, tools, and built-in agent metadata

## Product Thesis

axiom should be positioned as the easiest way for a developer or small product team to add working agent capabilities to a codebase without building an agent stack from scratch.

The repo now supports three clear promises:
- import a working built-in agent and call `.run()`
- generate a reusable custom agent from one description
- inspect what ran locally with durable project-level history

This keeps axiom distinct from:
- agent frameworks that expose abstractions and orchestration primitives
- no-code chat products that are hard to embed into product workflows
- raw model SDKs that leave prompts, tools, storage, and observability to the user

The strongest message is not "build agents with axiom." It is "ship agent capabilities immediately, then refine from there."

## Strategic Positioning

### What axiom Is

axiom is:
- a library of ready-made importable agents
- a builder for reusable custom agents
- a local-first developer surface with persistence and observability

### What axiom Is Not

axiom is not:
- a general-purpose agent framework
- a Claude replacement
- a hosted multi-user platform yet

That distinction matters because the repo already proves the local-first wedge. The next strategic work should deepen that wedge instead of diluting it with premature platform scope.

## Why The Current Shape Is Valuable

The implemented repo already solves several high-friction problems that raw SDK usage does not:
- it standardizes agent packaging and discovery
- it gives users reusable custom definitions instead of one-off prompts
- it persists run metadata locally without extra infrastructure
- it exposes a lightweight dashboard without requiring a hosted backend
- it keeps setup simple by prioritizing the Claude token workflow

That combination is the product. The hosted layer should be framed as an expansion of this local-first base, not a replacement for it.

## Commercial Sequence

### Current Layer

Current monetizable direction is still indirect but coherent:
- open-source or source-available local-first product
- publishable packages
- adoption through simplicity, breadth of ready-made agents, and builder UX

### Next Layer

The next commercial layer remains:
- axiom proxy
- hosted traces and dashboards
- centralized billing and cost controls
- team management and shared agents
- caching for repeated workflows

The important strategic split is:
- current runtime path: local-first, Claude-token powered, workspace-scoped
- future monetization path: hosted proxy and team platform on top

## What Makes axiom Defensible

Potential moat comes from:
- curated prompts and agent packaging
- prebuilt coverage across common workflows
- reusable custom agent definitions
- local and future hosted observability
- eventual switching cost once teams depend on saved agents, traces, and shared workflows

## Highest-Leverage Next Moves

### 1. Tighten v0.1 Distribution
- publish the packages cleanly
- verify end-to-end install outside the monorepo
- harden README and onboarding so the token-first workflow is obvious
- keep package tarballs clean and predictable

### 2. Improve Output Reliability
- add more tests around run persistence and CLI flows
- validate tool-call capture more deeply
- tighten custom-agent generation quality and fallback behavior
- add typed outputs for the highest-value built-in agents

### 3. Sharpen The Dashboard Story
- make observability feel intentional rather than merely available
- expand run filtering and detail inspection without adding backend complexity
- treat the dashboard as proof of the future hosted product

### 4. Prepare The Hosted Transition Carefully
- keep `AXIOM_API_KEY` and `baseUrl` support behind a clean abstraction
- avoid coupling the local product too tightly to one backend assumption
- design hosted traces, billing, and control-plane features as an additive path, not a breaking migration

## Current Gaps

The repo still does not implement:
- hosted SaaS dashboard
- axiom proxy and production billing layer
- multi-user backend or team auth
- sharing, marketplace, or versioned agent distribution
- semantic caching
- typed structured outputs as a first-class contract across agents
- robust CLI test coverage comparable to the agents package

These gaps are now honest roadmap items, not blockers to calling the current repo a product.

## Recommended Narrative For The Repo

The most accurate strategic narrative now is:

axiom v0.1 is a local-first agent library and builder with real runtime execution, reusable saved agents, and local observability. It is already the wedge. The next phase is to convert that wedge into a hosted control plane and billing layer without losing the simplicity that makes the current repo compelling.

## Success Criteria

The repository should let a user:
1. install and build the workspace cleanly
2. authenticate with a Claude token or Anthropic key
3. run a built-in agent from code or the CLI
4. create, run, and save a custom agent
5. inspect persisted runs in the local dashboard
6. pack or publish the packages without leaking tests or workspace-only artifacts

If those paths stay strong, axiom has a credible foundation for the next commercial layer.
