import { promises as fs } from "node:fs";

type Scalar = string | number | boolean | null;
type Row = Record<string, Scalar>;

async function loadInput(target: string): Promise<{ content: string; source: string }> {
  try {
    const content = await fs.readFile(target, "utf-8");
    return { content, source: target };
  } catch {
    return { content: target, source: "inline input" };
  }
}

function toScalar(value: unknown): Scalar {
  if (value === "" || value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return JSON.stringify(value);
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeJson(data: unknown): Row[] {
  if (Array.isArray(data)) {
    if (data.every(item => typeof item === "object" && item !== null && !Array.isArray(item))) {
      return data.map(item =>
        Object.fromEntries(
          Object.entries(item as Record<string, unknown>).map(([key, value]) => [key, toScalar(value)])
        )
      );
    }

    return data.map((value, index) => ({ index, value: toScalar(value) }));
  }

  if (typeof data === "object" && data !== null) {
    return [Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toScalar(value)]))];
  }

  return [{ value: toScalar(data) }];
}

function parseRows(content: string): { rows: Row[]; format: "json" | "csv" } {
  try {
    return { rows: normalizeJson(JSON.parse(content)), format: "json" };
  } catch {
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return { rows: [], format: "csv" };
    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map(line => {
      const values = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header || `column_${index + 1}`, toScalar(values[index] ?? null)]));
    });
    return { rows, format: "csv" };
  }
}

function asNumber(value: Scalar): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function analyze(target: string): Promise<string> {
  const { content, source } = await loadInput(target);
  const { rows, format } = parseRows(content);

  if (rows.length === 0) {
    return "No structured rows detected. Provide CSV or JSON data.";
  }

  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const output: string[] = [
    "# Data Analysis Report",
    "",
    "## Dataset Overview",
    "",
    `- **Source**: ${source}`,
    `- **Format**: ${format.toUpperCase()}`,
    `- **Rows**: ${rows.length}`,
    `- **Columns**: ${columns.length}`,
    `- **Fields**: ${columns.join(", ")}`,
    "",
  ];

  const missing = new Map<string, number>();

  output.push("## Column Summaries", "");
  for (const column of columns) {
    const values = rows.map(row => row[column] ?? null);
    const populated = values.filter(value => value !== null && value !== "");
    missing.set(column, values.length - populated.length);

    const numeric = populated
      .map(value => asNumber(value))
      .filter((value): value is number => value !== null);

    if (numeric.length > 0 && numeric.length >= Math.max(1, Math.floor(populated.length * 0.6))) {
      const total = numeric.reduce((sum, value) => sum + value, 0);
      output.push(`- **${column}**: numeric, min ${Math.min(...numeric)}, max ${Math.max(...numeric)}, avg ${(total / numeric.length).toFixed(2)}`);
      continue;
    }

    const counts = new Map<string, number>();
    for (const value of populated) {
      const key = String(value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const top = [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([value, count]) => `${value} (${count})`)
      .join(", ");

    output.push(`- **${column}**: categorical, ${counts.size} distinct` + (top ? ` — ${top}` : ""));
  }

  output.push("", "## Missing Data", "");
  for (const [column, count] of missing.entries()) {
    output.push(`- **${column}**: ${count}`);
  }

  output.push("", "## Sample Rows", "", "```json", JSON.stringify(rows.slice(0, 3), null, 2), "```", "");
  output.push("## Recommendations", "");

  const sparseColumns = [...missing.entries()]
    .filter(([, count]) => count / rows.length >= 0.25)
    .map(([column]) => column);

  if (sparseColumns.length > 0) {
    output.push(`- Validate missing-data handling for ${sparseColumns.join(", ")} before downstream reporting.`);
  } else {
    output.push("- Dataset looks consistent enough for a first-pass report or dashboard.");
  }

  return output.join("\n");
}
