import { AgentContext, AgentDefinition } from '@agent-platform/core';
import { readFileTool } from '../tools/file-tools';

type RecordValue = string | number | boolean | null;
type DatasetRow = Record<string, RecordValue>;

interface DatasetSummary {
  source: string;
  format: 'json' | 'csv';
  rowCount: number;
  columnCount: number;
  columns: string[];
  missingByColumn: Record<string, number>;
  numericSummaries: Array<{
    column: string;
    count: number;
    min: number;
    max: number;
    average: number;
  }>;
  categoricalSummaries: Array<{
    column: string;
    distinct: number;
    topValues: Array<{ value: string; count: number }>;
  }>;
  sampleRows: DatasetRow[];
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
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

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function toScalar(value: unknown): RecordValue {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function normalizeJsonData(data: unknown): DatasetRow[] {
  if (Array.isArray(data)) {
    if (data.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
      return data.map(item =>
        Object.fromEntries(
          Object.entries(item as Record<string, unknown>).map(([key, value]) => [key, toScalar(value)])
        )
      );
    }

    return data.map((value, index) => ({
      index,
      value: toScalar(value),
    }));
  }

  if (typeof data === 'object' && data !== null) {
    const candidate = data as Record<string, unknown>;
    for (const key of ['rows', 'data', 'items', 'records']) {
      if (Array.isArray(candidate[key])) {
        return normalizeJsonData(candidate[key]);
      }
    }

    return [
      Object.fromEntries(
        Object.entries(candidate).map(([key, value]) => [key, toScalar(value)])
      ),
    ];
  }

  return [{ value: toScalar(data) }];
}

function parseCsv(content: string): DatasetRow[] {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header || `column_${index + 1}`, toScalar(values[index] ?? null)])
    );
  });
}

function inferNumber(value: RecordValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  if (value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function summarizeDataset(rows: DatasetRow[], source: string, format: 'json' | 'csv'): DatasetSummary {
  const columns = Array.from(
    new Set(rows.flatMap(row => Object.keys(row)))
  );

  const missingByColumn = Object.fromEntries(columns.map(column => [column, 0]));
  const numericSummaries: DatasetSummary['numericSummaries'] = [];
  const categoricalSummaries: DatasetSummary['categoricalSummaries'] = [];

  for (const column of columns) {
    const values = rows.map(row => row[column] ?? null);
    const numericValues = values
      .map(value => inferNumber(value))
      .filter((value): value is number => value !== null);

    const nonEmptyValues = values.filter(value => value !== null && value !== '');
    missingByColumn[column] = values.length - nonEmptyValues.length;

    if (numericValues.length > 0 && numericValues.length >= Math.max(1, Math.floor(nonEmptyValues.length * 0.6))) {
      const total = numericValues.reduce((sum, value) => sum + value, 0);
      numericSummaries.push({
        column,
        count: numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        average: total / numericValues.length,
      });
      continue;
    }

    const frequencies = new Map<string, number>();
    for (const value of nonEmptyValues) {
      const key = String(value);
      frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
    }

    categoricalSummaries.push({
      column,
      distinct: frequencies.size,
      topValues: [...frequencies.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([value, count]) => ({ value, count })),
    });
  }

  return {
    source,
    format,
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    missingByColumn,
    numericSummaries,
    categoricalSummaries,
    sampleRows: rows.slice(0, 3),
  };
}

function buildRecommendations(summary: DatasetSummary): string[] {
  const recommendations: string[] = [];

  const sparseColumns = Object.entries(summary.missingByColumn)
    .filter(([, missing]) => summary.rowCount > 0 && missing / summary.rowCount >= 0.25)
    .map(([column]) => column);

  if (sparseColumns.length > 0) {
    recommendations.push(
      `Validate missing-data handling for ${sparseColumns.join(', ')} before using the dataset for reporting or automation.`
    );
  }

  const wideRangeColumns = summary.numericSummaries
    .filter(column => column.max - column.min > Math.abs(column.average || 0) * 3)
    .map(column => column.column);

  if (wideRangeColumns.length > 0) {
    recommendations.push(
      `Check outliers or segmentation opportunities in ${wideRangeColumns.join(', ')}; the ranges are wide enough to skew averages.`
    );
  }

  const highCardinalityColumns = summary.categoricalSummaries
    .filter(column => column.distinct > Math.max(10, summary.rowCount * 0.5))
    .map(column => column.column);

  if (highCardinalityColumns.length > 0) {
    recommendations.push(
      `Treat ${highCardinalityColumns.join(', ')} as identifier-like fields rather than grouping dimensions.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Dataset shape looks consistent enough for first-pass reporting and dashboard exploration.');
  }

  return recommendations;
}

function formatSummary(summary: DatasetSummary): string {
  const recommendations = buildRecommendations(summary);

  let report = `# Data Analysis Report\n\n`;
  report += `## Dataset Overview\n\n`;
  report += `- **Source**: ${summary.source}\n`;
  report += `- **Detected format**: ${summary.format.toUpperCase()}\n`;
  report += `- **Rows**: ${summary.rowCount}\n`;
  report += `- **Columns**: ${summary.columnCount}\n`;
  report += `- **Fields**: ${summary.columns.join(', ')}\n\n`;

  if (summary.numericSummaries.length > 0) {
    report += `## Numeric Columns\n\n`;
    for (const column of summary.numericSummaries) {
      report += `- **${column.column}**: min ${column.min}, max ${column.max}, avg ${column.average.toFixed(2)} (${column.count} numeric values)\n`;
    }
    report += `\n`;
  }

  if (summary.categoricalSummaries.length > 0) {
    report += `## Categorical Columns\n\n`;
    for (const column of summary.categoricalSummaries) {
      const topValues = column.topValues
        .map(item => `${item.value} (${item.count})`)
        .join(', ');
      report += `- **${column.column}**: ${column.distinct} distinct values`;
      if (topValues) {
        report += ` — top values: ${topValues}`;
      }
      report += `\n`;
    }
    report += `\n`;
  }

  report += `## Missing Data\n\n`;
  for (const [column, missing] of Object.entries(summary.missingByColumn)) {
    report += `- **${column}**: ${missing} missing value(s)\n`;
  }
  report += `\n`;

  if (summary.sampleRows.length > 0) {
    report += `## Sample Rows\n\n`;
    summary.sampleRows.forEach((row, index) => {
      report += `### Row ${index + 1}\n`;
      report += '```json\n';
      report += `${JSON.stringify(row, null, 2)}\n`;
      report += '```\n\n';
    });
  }

  report += `## Recommendations\n\n`;
  recommendations.forEach(item => {
    report += `- ${item}\n`;
  });
  report += `\n---\n*Analysis generated by Agent Platform Data Analysis Agent*\n`;

  return report;
}

function parseDataset(content: string): { rows: DatasetRow[]; format: 'json' | 'csv' } {
  try {
    const parsed = JSON.parse(content);
    return {
      rows: normalizeJsonData(parsed),
      format: 'json',
    };
  } catch {
    return {
      rows: parseCsv(content),
      format: 'csv',
    };
  }
}

const dataAnalysisAgent: AgentDefinition = {
  name: 'data-analysis-agent',
  version: '1.0.0',
  description: 'Profiles CSV or JSON datasets and produces a concise analysis report',
  author: 'Agent Platform',
  tags: ['data', 'analysis', 'csv', 'json', 'reporting'],
  systemPrompt: `You are a pragmatic data analyst. Work with structured data, highlight dataset quality, and produce reports that are easy to act on.`,
  tools: ['read-file'],
  config: {
    model: 'claude-sonnet-4',
    provider: 'anthropic',
    temperature: 0.2,
    maxTokens: 4000,
  },
  async onInit(context: AgentContext) {
    if (!context.tools.has('read-file')) {
      context.tools.set('read-file', readFileTool);
    }
  },
  async execute(input: string, context: AgentContext): Promise<string> {
    const target = input.trim();
    let source = 'inline input';
    let content = target;

    const readTool = context.tools.get('read-file');

    if (readTool) {
      try {
        const file = await readTool.execute({ filePath: target }, context);
        content = file.content;
        source = target;
      } catch {
        source = 'inline input';
      }
    }

    const parsed = parseDataset(content);
    if (parsed.rows.length === 0) {
      return 'No tabular data detected. Provide a CSV file, JSON file, JSON array, or inline CSV/JSON content.';
    }

    const summary = summarizeDataset(parsed.rows, source, parsed.format);
    return formatSummary(summary);
  },
};

export default dataAnalysisAgent;
