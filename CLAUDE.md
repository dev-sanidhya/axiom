# Claude Code Project Instructions

## Git Workflow

- **Always work directly on the `main` branch.** Do not create worktrees or feature branches unless explicitly asked.
- Before making any changes, ensure the local `main` branch is up to date.
- Commit changes directly to `main` and push to `origin main`.

## Product Naming

- The product is called **axiom** (always lowercase).
- All references in code, docs, CLI output, and comments must use `axiom`, never `AgentOS`.
- Package scopes use `@axiom/*` (e.g. `@axiom/agents`, `@axiom/cli`, `@axiom/dashboard`).
- Local persistence directory is `.axiom/`.
