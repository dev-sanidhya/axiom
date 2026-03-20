import csv
import json
from pathlib import Path
from typing import Any


def _to_scalar(value: Any):
    if value in ("", None):
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    return json.dumps(value)


def _load_input(target: str) -> tuple[str, str]:
    path = Path(target)
    if path.exists() and path.is_file():
      return path.read_text(encoding="utf-8"), str(path)
    return target, "inline input"


def _normalize_json(data: Any):
    if isinstance(data, list):
        if all(isinstance(item, dict) for item in data):
            return [{key: _to_scalar(value) for key, value in item.items()} for item in data]
        return [{"index": index, "value": _to_scalar(value)} for index, value in enumerate(data)]

    if isinstance(data, dict):
        for key in ("rows", "data", "items", "records"):
            if isinstance(data.get(key), list):
                return _normalize_json(data[key])
        return [{key: _to_scalar(value) for key, value in data.items()}]

    return [{"value": _to_scalar(data)}]


def _parse_csv(text: str):
    lines = [line for line in text.splitlines() if line.strip()]
    if not lines:
        return []
    reader = csv.DictReader(lines)
    return [{key: _to_scalar(value) for key, value in row.items()} for row in reader]


def _parse_rows(text: str):
    try:
        return _normalize_json(json.loads(text)), "json"
    except json.JSONDecodeError:
        return _parse_csv(text), "csv"


def _numeric(value):
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def analyze(target: str) -> str:
    content, source = _load_input(target)
    rows, fmt = _parse_rows(content)

    if not rows:
        return "No structured rows detected. Provide CSV or JSON data."

    columns = sorted({column for row in rows for column in row.keys()})
    missing = {column: 0 for column in columns}
    numeric_lines = []
    categorical_lines = []

    for column in columns:
        values = [row.get(column) for row in rows]
        populated = [value for value in values if value not in (None, "")]
        missing[column] = len(values) - len(populated)

        numeric_values = [value for value in (_numeric(item) for item in populated) if value is not None]
        if numeric_values and len(numeric_values) >= max(1, int(len(populated) * 0.6)):
            average = sum(numeric_values) / len(numeric_values)
            numeric_lines.append(
                f"- **{column}**: min {min(numeric_values):.2f}, max {max(numeric_values):.2f}, avg {average:.2f}"
            )
            continue

        counts = {}
        for value in populated:
            key = str(value)
            counts[key] = counts.get(key, 0) + 1

        top = ", ".join(
            f"{value} ({count})" for value, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)[:3]
        )
        categorical_lines.append(f"- **{column}**: {len(counts)} distinct values" + (f" — {top}" if top else ""))

    report = [
        "# Data Analysis Report",
        "",
        "## Dataset Overview",
        "",
        f"- **Source**: {source}",
        f"- **Format**: {fmt.upper()}",
        f"- **Rows**: {len(rows)}",
        f"- **Columns**: {len(columns)}",
        f"- **Fields**: {', '.join(columns)}",
        "",
    ]

    if numeric_lines:
        report.extend(["## Numeric Columns", "", *numeric_lines, ""])

    if categorical_lines:
        report.extend(["## Categorical Columns", "", *categorical_lines, ""])

    report.extend(["## Missing Data", ""])
    report.extend([f"- **{column}**: {count}" for column, count in missing.items()])
    report.extend(["", "## Sample Rows", "", "```json", json.dumps(rows[:3], indent=2), "```", ""])

    sparse_columns = [column for column, count in missing.items() if count / len(rows) >= 0.25]
    report.extend(["## Recommendations", ""])
    if sparse_columns:
        report.append(f"- Validate missing-data handling for {', '.join(sparse_columns)} before downstream reporting.")
    else:
        report.append("- Dataset looks consistent enough for a first-pass report or dashboard.")

    return "\n".join(report)
