# {{AgentName}} - Raw Python Data Analysis Agent

Profiles CSV or JSON data without any agent framework. It is intended for quick dataset inspection, lightweight reporting, and local scripting.

## What it does

- Detects JSON vs CSV input
- Counts rows, columns, and missing values
- Computes simple numeric summaries
- Highlights common data-quality issues

## Quick start

```bash
python example.py
```

Or use it directly:

```python
from {{agent_name}} import analyze

report = analyze("sales.csv")
print(report)
```

## Input formats

- File path to a `.csv` or `.json` file
- Inline CSV content
- Inline JSON array / object

## Notes

- CSV parsing is deliberately lightweight and best suited for clean files
- Numeric summaries are first-pass statistics, not full analytics
- This template uses only the Python standard library
