# {{AgentName}} - Raw TypeScript Data Analysis Agent

Profiles CSV or JSON input with no external AI framework. Use it when you need a simple TypeScript utility for quick dataset checks.

## What it does

- Accepts file paths or inline data
- Detects JSON vs CSV
- Computes row counts, missing values, and numeric summaries
- Produces a markdown report you can save or display

## Quick start

```bash
npm install
npm run example
```

## Usage

```ts
import { analyze } from "./{{agentName}}";

const report = await analyze("sales.csv");
console.log(report);
```
