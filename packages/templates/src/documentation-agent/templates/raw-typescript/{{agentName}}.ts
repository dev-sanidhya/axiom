import { promises as fs } from "node:fs";
import path from "node:path";

interface Insight {
  path: string;
  exports: string[];
  classes: string[];
  functions: string[];
  headings: string[];
}

function collect(content: string, regex: RegExp): string[] {
  return [...content.matchAll(regex)].map(match => match[1]).filter(Boolean).slice(0, 8);
}

async function analyzeFile(filePath: string): Promise<Insight> {
  const content = await fs.readFile(filePath, "utf-8");
  return {
    path: filePath,
    exports: collect(content, /export\s+(?:const|function|class|type|interface)\s+([A-Za-z0-9_]+)/g),
    classes: collect(content, /class\s+([A-Za-z0-9_]+)/g),
    functions: [
      ...collect(content, /function\s+([A-Za-z0-9_]+)/g),
      ...collect(content, /def\s+([A-Za-z0-9_]+)/g),
    ].slice(0, 8),
    headings: collect(content, /^#+\s+(.+)$/gm),
  };
}

async function walk(dirPath: string, results: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, results);
    } else if (/\.(ts|tsx|js|jsx|py|md|json)$/.test(entry.name)) {
      results.push(fullPath);
    }
    if (results.length >= 6) break;
  }
  return results;
}

export async function document(target: string): Promise<string> {
  const insights: Insight[] = [];

  try {
    const stats = await fs.stat(target);
    if (stats.isFile()) {
      insights.push(await analyzeFile(target));
    } else if (stats.isDirectory()) {
      const files = await walk(target);
      for (const filePath of files) {
        insights.push(await analyzeFile(filePath));
      }
    }
  } catch {
    return [
      "# Documentation Outline",
      "",
      "## Goal",
      "",
      target,
      "",
      "## Recommended Sections",
      "",
      "- Overview",
      "- Key workflows",
      "- Configuration",
      "- Examples",
      "- Troubleshooting",
    ].join("\n");
  }

  const lines: string[] = [
    "# Documentation Summary",
    "",
    "## Overview",
    "",
    `Reviewed ${insights.length} file(s) to generate a documentation baseline.`,
    "",
    "## Notable Files",
    "",
  ];

  for (const insight of insights) {
    lines.push(`### ${insight.path}`, "");
    if (insight.exports.length > 0) lines.push(`- **Exports**: ${insight.exports.join(", ")}`);
    if (insight.classes.length > 0) lines.push(`- **Classes**: ${insight.classes.join(", ")}`);
    if (insight.functions.length > 0) lines.push(`- **Functions**: ${insight.functions.join(", ")}`);
    if (insight.headings.length > 0) lines.push(`- **Headings**: ${insight.headings.join(", ")}`);
    lines.push("");
  }

  lines.push(
    "## Suggested README Structure",
    "",
    "- Overview",
    "- Primary entry points and APIs",
    "- Setup or configuration prerequisites",
    "- Usage examples",
    "- Troubleshooting"
  );

  return lines.join("\n");
}
