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
