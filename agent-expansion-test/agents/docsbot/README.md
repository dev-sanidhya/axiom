# Docsbot - Raw TypeScript Documentation Agent

Reads a file or small directory tree and produces a documentation baseline.

## Quick start

```bash
npm install
npm run example
```

## Usage

```ts
import { document } from "./docsbot";

const summary = await document("src");
console.log(summary);
```
