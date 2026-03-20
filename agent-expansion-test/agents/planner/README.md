# Planner - Raw TypeScript Task Planner Agent

Turns a goal into a phased execution plan without depending on an AI framework.

## Quick start

```bash
npm install
npm run example
```

## Usage

```ts
import { planTask } from "./planner";

const plan = planTask("Goal: Ship a reporting page");
console.log(plan);
```
